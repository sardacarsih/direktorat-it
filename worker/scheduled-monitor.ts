import { collectPublicStatus, ORIGIN_STATUS_URL } from './monitor.ts';
import type {
	StatusSnapshot,
	SystemStatus,
	PublicHistory,
	MonitorEvent
} from '../src/lib/status.ts';

const MINUTE = 60000;
const WINDOW = 30 * 24 * 60 * MINUTE;
type SQL = {
	exec<T = Record<string, unknown>>(
		query: string,
		...values: (string | number | null)[]
	): { toArray(): T[] };
};
type Storage = { sql: SQL; transactionSync<T>(callback: () => T): T };
type MonitorEnvironment = {
	ORIGIN_STATUS_URL?: string;
	ALERT_EMAIL_FROM?: string;
	ALERT_EMAIL_TO?: string;
	RESEND_API_KEY?: string;
};
type Channel = {
	stable: 'operational' | 'down' | null;
	successes: number;
	failures: number;
	lastSlot: number;
};

export function advance(previous: Channel | null, ok: boolean, slot: number) {
	const state: Channel = previous
		? { ...previous }
		: { stable: null, successes: 0, failures: 0, lastSlot: slot };
	if (slot - state.lastSlot > MINUTE) state.successes = state.failures = 0;
	state.lastSlot = slot;
	state.successes = ok ? Math.min(2, state.successes + 1) : 0;
	state.failures = ok ? 0 : Math.min(3, state.failures + 1);
	const before = state.stable;
	if (state.successes >= 2) state.stable = 'operational';
	if (state.failures >= 3) state.stable = 'down';
	const changed = state.stable !== before && (before !== null || state.stable === 'down');
	const status: SystemStatus =
		state.stable === 'down' ? 'down' : !ok || state.stable === null ? 'degraded' : 'operational';
	return { state, status, changed };
}

// A single SQLite-backed object owns all samples, counters and notification delivery.
// Public requests only read its snapshot and never create probes or samples.
export class PublicMonitor {
	private sql: SQL;
	private running: Promise<void> | null = null;
	constructor(
		private ctx: { storage: Storage },
		private env: MonitorEnvironment,
		private dependencies = { collect: collectPublicStatus, fetcher: fetch, now: Date.now }
	) {
		this.sql = ctx.storage.sql;
		this.sql.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS samples (slot INTEGER NOT NULL, app TEXT NOT NULL, ok INTEGER NOT NULL, page_ok INTEGER NOT NULL, PRIMARY KEY(slot, app));
      CREATE INDEX IF NOT EXISTS samples_app_slot ON samples(app, slot);
      CREATE TABLE IF NOT EXISTS totals (app TEXT PRIMARY KEY, count INTEGER NOT NULL, successes INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, at INTEGER NOT NULL, payload TEXT NOT NULL, delivered INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS events_delivery ON events(delivered, next_attempt);`);
	}
	private get<T>(key: string): T | null {
		const row = this.sql
			.exec<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)
			.toArray()[0];
		return row ? (JSON.parse(row.value) as T) : null;
	}
	private put(key: string, value: unknown) {
		this.sql.exec(
			'INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
			key,
			JSON.stringify(value)
		);
	}
	async fetch(request: Request): Promise<Response> {
		const path = new URL(request.url).pathname;
		if (path === '/tick' && request.method === 'POST') {
			const scheduled = Number(await request.text());
			const now = this.dependencies.now();
			if (!Number.isFinite(scheduled) || Math.abs(now - scheduled) > 90000)
				return new Response('Expired tick', { status: 400 });
			if (!this.running)
				this.running = this.tick(Math.floor(scheduled / MINUTE) * MINUTE).finally(() => {
					this.running = null;
				});
			await this.running;
			return new Response('Checked');
		}
		if (path !== '/status' || !['GET', 'HEAD'].includes(request.method))
			return new Response('Not found', { status: 404 });
		const snapshot = this.get<StatusSnapshot>('snapshot');
		const headers = { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
		if (!snapshot)
			return Response.json(
				{ error: 'Waiting for first scheduled check' },
				{ status: 503, headers }
			);
		const result = Response.json(snapshot, { headers });
		return request.method === 'HEAD' ? new Response(null, result) : result;
	}
	private async tick(slot: number): Promise<void> {
		if ((this.get<number>('lastSlot') ?? -1) >= slot) return;
		const snapshot = await this.dependencies.collect(
			this.dependencies.fetcher,
			this.env.ORIGIN_STATUS_URL ?? ORIGIN_STATUS_URL
		);
		this.ctx.storage.transactionSync(() => {
			if ((this.get<number>('lastSlot') ?? -1) >= slot) return;
			const cutoff = slot - WINDOW;
			const expired = this.sql
				.exec<{ app: string; count: number; successes: number }>(
					'SELECT app, COUNT(*) AS count, SUM(ok) AS successes FROM samples INDEXED BY sqlite_autoindex_samples_1 WHERE slot <= ? GROUP BY app',
					cutoff
				)
				.toArray();
			for (const row of expired)
				this.sql.exec(
					'UPDATE totals SET count=count-?, successes=successes-? WHERE app=?',
					row.count,
					row.successes,
					row.app
				);
			this.sql.exec('DELETE FROM samples WHERE slot <= ?', cutoff);
			this.sql.exec('DELETE FROM events WHERE at < ?', cutoff);
			for (const app of snapshot.apps) {
				const ok = app.status === 'operational';
				const pageOk = app.publicStatus === 'operational';
				this.sql.exec(
					'INSERT INTO samples(slot,app,ok,page_ok) VALUES(?,?,?,?)',
					slot,
					app.id,
					+ok,
					+pageOk
				);
				this.sql.exec(
					'INSERT INTO totals(app,count,successes) VALUES(?,1,?) ON CONFLICT(app) DO UPDATE SET count=count+1,successes=successes+excluded.successes',
					app.id,
					+ok
				);
				app.status = this.channel(`app:${app.id}`, ok, slot);
				app.publicStatus =
					app.checkType === 'http' ? app.status : this.channel(`page:${app.id}`, pageOk, slot);
				this.alert(app, slot);
				const total = this.sql
					.exec<{ count: number; successes: number }>(
						'SELECT count,successes FROM totals WHERE app=?',
						app.id
					)
					.toArray()[0];
				const recent = this.sql
					.exec<{ slot: number; ok: number }>(
						'SELECT slot,ok FROM samples WHERE app=? ORDER BY slot DESC LIMIT 30',
						app.id
					)
					.toArray()
					.reverse();
				const first = this.sql
					.exec<{ slot: number }>(
						'SELECT slot FROM samples WHERE app=? ORDER BY slot LIMIT 1',
						app.id
					)
					.toArray()[0];
				app.publicHistory = {
					uptimePercent: total.count ? (total.successes / total.count) * 100 : null,
					sampleCount: total.count,
					coveragePercent: Math.min(100, (total.count / 43200) * 100),
					since: first ? new Date(first.slot).toISOString() : null,
					history: recent.map((row) => row.ok === 1)
				} satisfies PublicHistory;
			}
			const statuses = snapshot.apps.map((app) => app.publicStatus);
			snapshot.public = {
				status: statuses.every((s) => s === 'operational')
					? 'operational'
					: statuses.every((s) => s === 'down')
						? 'down'
						: 'degraded',
				available: statuses.filter((s) => s === 'operational').length,
				total: statuses.length
			};
			snapshot.version = 3;
			snapshot.monitoring = {
				intervalSeconds: 60,
				failureThreshold: 3,
				recoveryThreshold: 2,
				notificationConfigured: Boolean(
					this.env.RESEND_API_KEY && this.env.ALERT_EMAIL_FROM && this.env.ALERT_EMAIL_TO
				),
				events: []
			};
			this.put('snapshot', snapshot);
			this.put('lastSlot', slot);
		});
		await this.deliver();
		const stored = this.get<StatusSnapshot>('snapshot')!;
		stored.monitoring!.events = this.sql
			.exec<{ payload: string; delivered: number }>(
				'SELECT payload,delivered FROM events ORDER BY at DESC LIMIT 12'
			)
			.toArray()
			.map((row) => ({ ...JSON.parse(row.payload), delivered: row.delivered === 1 }));
		this.put('snapshot', stored);
	}
	private channel(key: string, ok: boolean, slot: number): SystemStatus {
		const { state, status } = advance(this.get<Channel>(key), ok, slot);
		this.put(key, state);
		return status;
	}
	// One alert per outage per application: "down" once when either check fails for good,
	// "operational" once when both have recovered. Repeated failures stay silent.
	private alert(
		app: { id: string; name: string; status: SystemStatus; publicStatus: SystemStatus },
		slot: number
	) {
		const key = `alert:${app.id}`;
		const previous = this.get<'operational' | 'down'>(key);
		const current = app.status === 'down' || app.publicStatus === 'down' ? 'down' : 'operational';
		if (current === previous || (previous === null && current === 'operational')) {
			if (previous === null) this.put(key, current);
			return;
		}
		this.put(key, current);
		const event: MonitorEvent = {
			id: `${key}:${slot}`,
			at: new Date(slot).toISOString(),
			appId: app.id,
			name: app.name,
			check: app.status === 'down' || current === 'operational' ? 'application' : 'page',
			status: current,
			delivered: false
		};
		this.sql.exec(
			'INSERT INTO events(id,at,payload,next_attempt) VALUES(?,?,?,?)',
			event.id,
			slot,
			JSON.stringify(event),
			slot
		);
	}
	private async deliver(): Promise<void> {
		if (!this.env.RESEND_API_KEY || !this.env.ALERT_EMAIL_FROM || !this.env.ALERT_EMAIL_TO) return;
		const now = this.dependencies.now();
		const pending = this.sql
			.exec<{ id: string; payload: string; attempts: number }>(
				'SELECT id,payload,attempts FROM events WHERE delivered=0 AND next_attempt<=? ORDER BY at LIMIT 10',
				now
			)
			.toArray();
		for (const event of pending) {
			let delivered = false;
			try {
				const change = JSON.parse(event.payload) as MonitorEvent;
				const response = await this.dependencies.fetcher('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
						'Content-Type': 'application/json',
						'Idempotency-Key': event.id
					},
					body: JSON.stringify({
						from: this.env.ALERT_EMAIL_FROM,
						to: this.env.ALERT_EMAIL_TO.split(',').map((address) => address.trim()),
						subject: `[Direktorat IT] ${change.name}: ${change.status === 'down' ? 'TIDAK TERSEDIA' : 'PULIH'}`,
						text: `${change.name} (${change.check === 'page' ? 'halaman HTTPS' : 'aplikasi'}) ${change.status === 'down' ? 'mengalami gangguan setelah 3 kegagalan berturut-turut' : 'pulih setelah 2 keberhasilan berturut-turut'}.\nWaktu: ${change.at}\nEvent: ${change.id}\nDashboard: https://it.kskgroup.web.id/#sistem`
					})
				});
				if (!response.ok) throw new Error('Resend rejected the message');
				delivered = true;
			} catch {
				/* Retry pending notifications without exposing addresses or provider errors. */
			}
			this.sql.exec(
				'UPDATE events SET delivered=?, attempts=attempts+1, next_attempt=? WHERE id=?',
				+delivered,
				now + Math.min(3600000, MINUTE * 2 ** Math.min(event.attempts, 6)),
				event.id
			);
		}
	}
}
