import { collectPublicStatus, ORIGIN_STATUS_URL } from './monitor.ts';
import { createFcmClient, parseServiceAccount } from './fcm.ts';
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
	ALERT_DAILY_LIMIT?: string;
	FCM_TOPIC?: string;
	// One Firebase service account JSON per application: FCM_SERVICE_ACCOUNT_<APP ID>.
	[serviceAccount: `FCM_SERVICE_ACCOUNT_${string}`]: string | undefined;
	// Optional Android notification channel per application: FCM_CHANNEL_<APP ID>.
	[channel: `FCM_CHANNEL_${string}`]: string | undefined;
};
const PUSH_MAX_AGE = 60 * MINUTE;
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
		// fetch must stay bound to globalThis: workerd rejects fetch called on another receiver.
		private dependencies = {
			collect: collectPublicStatus,
			fetcher: fetch.bind(globalThis),
			now: Date.now
		}
	) {
		this.sql = ctx.storage.sql;
		this.sql.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS samples (slot INTEGER NOT NULL, app TEXT NOT NULL, ok INTEGER NOT NULL, page_ok INTEGER NOT NULL, PRIMARY KEY(slot, app));
      CREATE INDEX IF NOT EXISTS samples_app_slot ON samples(app, slot);
      CREATE TABLE IF NOT EXISTS totals (app TEXT PRIMARY KEY, count INTEGER NOT NULL, successes INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, at INTEGER NOT NULL, payload TEXT NOT NULL, delivered INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS events_delivery ON events(delivered, next_attempt);
      CREATE TABLE IF NOT EXISTS pushes (event_id TEXT PRIMARY KEY, app TEXT NOT NULL, at INTEGER NOT NULL, delivered INTEGER NOT NULL DEFAULT 0, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0);`);
		this.fcm = createFcmClient(this.dependencies.fetcher, this.dependencies.now);
	}
	private fcm: ReturnType<typeof createFcmClient>;
	private serviceAccount(appId: string) {
		return parseServiceAccount(this.env[`FCM_SERVICE_ACCOUNT_${appId.toUpperCase()}`]);
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
			this.sql.exec('DELETE FROM pushes WHERE at < ?', cutoff);
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
		await this.push();
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
	// Events from all applications are emailed together as one digest by deliver().
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
		if (this.serviceAccount(app.id))
			this.sql.exec(
				'INSERT INTO pushes(event_id,app,at,next_attempt) VALUES(?,?,?,?)',
				event.id,
				app.id,
				slot,
				slot
			);
	}
	// All pending changes go out as one digest email so a shared outage costs one email,
	// not one per application. A daily cap (UTC, like Resend's quota) suppresses the rest.
	private async deliver(): Promise<void> {
		if (!this.env.RESEND_API_KEY || !this.env.ALERT_EMAIL_FROM || !this.env.ALERT_EMAIL_TO) return;
		const now = this.dependencies.now();
		const pending = this.sql
			.exec<{ id: string; payload: string; attempts: number; next_attempt: number }>(
				'SELECT id,payload,attempts,next_attempt FROM events WHERE delivered=0 ORDER BY at LIMIT 50'
			)
			.toArray();
		if (!pending.some((event) => event.next_attempt <= now)) return;
		const ids = pending.map((event) => event.id);
		const mark = (delivered: number, nextAttempt: number) =>
			this.sql.exec(
				`UPDATE events SET delivered=?, attempts=attempts+1, next_attempt=? WHERE id IN (${ids.map(() => '?').join(',')})`,
				delivered,
				nextAttempt,
				...ids
			);
		const day = new Date(now).toISOString().slice(0, 10);
		const stored = this.get<{ day: string; sent: number }>('emailQuota');
		const quota = stored?.day === day ? stored : { day, sent: 0 };
		const limit = Number(this.env.ALERT_DAILY_LIMIT) || 80;
		if (quota.sent >= limit) {
			mark(2, now);
			console.warn(`[alert-delivery] daily limit ${limit} reached; suppressed ${ids.join(', ')}`);
			return;
		}
		const changes = pending.map((event) => JSON.parse(event.payload) as MonitorEvent);
		const down = changes.filter((change) => change.status === 'down');
		const up = changes.filter((change) => change.status !== 'down');
		const subject =
			changes.length === 1
				? `[Direktorat IT] ${changes[0].name}: ${down.length ? 'TIDAK TERSEDIA' : 'PULIH'}`
				: `[Direktorat IT] ${[down.length && `Gangguan: ${down.length} sistem`, up.length && `Pulih: ${up.length} sistem`].filter(Boolean).join(', ')}`;
		const lines = (list: MonitorEvent[]) =>
			list.map(
				(change) =>
					`- ${change.name} (${change.check === 'page' ? 'halaman HTTPS' : 'aplikasi'}) — ${change.at}`
			);
		const text = [
			...(down.length ? ['TIDAK TERSEDIA (3 kegagalan berturut-turut):', ...lines(down), ''] : []),
			...(up.length ? ['PULIH (2 keberhasilan berturut-turut):', ...lines(up), ''] : []),
			'Dashboard: https://it.kskgroup.web.id/#sistem'
		].join('\n');
		const hash = await crypto.subtle.digest(
			'SHA-256',
			new TextEncoder().encode([...ids].sort().join('|'))
		);
		const key = `digest:${[...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
		try {
			const response = await this.dependencies.fetcher('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.env.RESEND_API_KEY}`,
					'Content-Type': 'application/json',
					'Idempotency-Key': key
				},
				body: JSON.stringify({
					from: this.env.ALERT_EMAIL_FROM,
					to: this.env.ALERT_EMAIL_TO.split(',').map((address) => address.trim()),
					subject,
					text
				})
			});
			if (!response.ok) {
				const headers = ['content-type', 'cf-ray', 'x-resend-error-id', 'retry-after']
					.map((name) => `${name}=${response.headers.get(name) ?? '-'}`)
					.join(' ');
				const detail = (
					await response
						.text()
						.catch((readError: unknown) => `body-unreadable: ${String(readError)}`)
				).slice(0, 300);
				throw new Error(`Resend ${response.status} ${headers} ${detail}`);
			}
			mark(1, now);
			this.put('emailQuota', { day, sent: quota.sent + 1 });
			console.log(`[alert-delivery] ${key} delivered (${ids.length} events)`);
		} catch (error) {
			// Failures are only visible in private observability logs; delivery is retried with backoff.
			console.error(
				`[alert-delivery] ${key} failed (${ids.length} events): ${error instanceof Error ? error.message : String(error)}`
			);
			const attempts = Math.max(...pending.map((event) => event.attempts));
			mark(0, now + Math.min(3600000, MINUTE * 2 ** Math.min(attempts, 6)));
		}
	}
	// Push notifications go to every user of the affected app through that app's own Firebase
	// project. Only the latest change per app is sent, and stale changes are dropped.
	private async push(): Promise<void> {
		const now = this.dependencies.now();
		// Older changes of an app with a newer one are superseded, never sent afterwards.
		this.sql.exec(
			'UPDATE pushes SET delivered=2 WHERE delivered=0 AND at < (SELECT MAX(at) FROM pushes AS newer WHERE newer.app=pushes.app)'
		);
		const pending = this.sql
			.exec<{ event_id: string; app: string; at: number; attempts: number; payload: string }>(
				'SELECT p.event_id,p.app,p.at,p.attempts,e.payload FROM pushes p JOIN events e ON e.id=p.event_id WHERE p.delivered=0 AND p.next_attempt<=? ORDER BY p.at DESC LIMIT 20',
				now
			)
			.toArray();
		for (const item of pending) {
			const account = this.serviceAccount(item.app);
			if (now - item.at > PUSH_MAX_AGE || !account) {
				this.sql.exec('UPDATE pushes SET delivered=2 WHERE event_id=?', item.event_id);
				continue;
			}
			const change = JSON.parse(item.payload) as MonitorEvent;
			const down = change.status === 'down';
			const collapse = `status-${change.appId}`;
			// Devices without this channel fall back to the app's default channel.
			const channel = this.env[`FCM_CHANNEL_${change.appId.toUpperCase()}`];
			try {
				await this.fcm.sendTopic(account, {
					topic: this.env.FCM_TOPIC || 'service-status',
					notification: {
						title: down
							? `${change.name} sedang mengalami gangguan`
							: `${change.name} sudah normal kembali`,
						body: down
							? 'Layanan sementara tidak dapat diakses. Tim IT sedang menangani.'
							: 'Layanan sudah dapat digunakan kembali.'
					},
					data: { appId: change.appId, status: change.status, eventId: change.id, at: change.at },
					android: {
						priority: 'HIGH',
						collapse_key: collapse,
						ttl: '3600s',
						...(channel ? { notification: { channel_id: channel } } : {})
					},
					apns: {
						headers: {
							'apns-collapse-id': collapse,
							'apns-expiration': String(Math.floor(now / 1000) + 3600)
						}
					}
				});
				this.sql.exec(
					'UPDATE pushes SET delivered=1, attempts=attempts+1 WHERE event_id=?',
					item.event_id
				);
				console.log(`[push-delivery] ${item.event_id} delivered`);
			} catch (error) {
				console.error(
					`[push-delivery] ${item.event_id} failed: ${error instanceof Error ? error.message : String(error)}`
				);
				this.sql.exec(
					'UPDATE pushes SET attempts=attempts+1, next_attempt=? WHERE event_id=?',
					now + Math.min(3600000, MINUTE * 2 ** Math.min(item.attempts, 6)),
					item.event_id
				);
			}
		}
	}
}
