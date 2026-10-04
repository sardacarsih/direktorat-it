import test from 'node:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import config from '../deploy/monitoring/config.json' with { type: 'json' };
import { PublicMonitor, advance } from './scheduled-monitor.ts';
import { parseStatus, freshOriginData } from '../src/lib/status.ts';
import worker from './index.ts';

const MINUTE = 60000;
function harness(env = {}, db = new Database(':memory:')) {
	let now = Math.floor(Date.now() / MINUTE) * MINUTE - 31 * 24 * 60 * MINUTE;
	let ok = true;
	let pageOk = true;
	let calls = 0;
	const ctx = {
		storage: {
			sql: {
				exec(query, ...values) {
					if (query.includes('CREATE TABLE')) {
						db.exec(query);
						return { toArray: () => [] };
					}
					const rows = db.query(query).all(...values);
					return { toArray: () => rows };
				}
			},
			transactionSync(callback) {
				return db.transaction(callback)();
			}
		}
	};
	const dependencies = {
		now: () => now,
		fetcher: fetch,
		collect: async () => {
			calls++;
			return {
				version: 2,
				checkedAt: new Date(now).toISOString(),
				windowDays: 30,
				probeLocation: 'cloudflare',
				externalMonitor: true,
				originCheckedAt: null,
				host: null,
				database: null,
				apps: config.apps.map((app) => ({
					id: app.id,
					name: app.name,
					status: ok ? 'operational' : 'down',
					publicStatus: pageOk ? 'operational' : 'down',
					latencyMs: ok ? 10 : null,
					publicLatencyMs: pageOk ? 10 : null,
					checkType: app.publicHealthPath ? 'health' : 'http',
					uptimePercent: null,
					sampleCount: 0,
					coveragePercent: 0,
					since: null,
					history: []
				})),
				public: { status: 'operational', available: 6, total: 6 }
			};
		}
	};
	let monitor = new PublicMonitor(ctx, env, dependencies);
	return {
		db,
		set(okValue, page = true) {
			ok = okValue;
			pageOk = page;
		},
		get calls() {
			return calls;
		},
		async tick(step = MINUTE) {
			const response = await monitor.fetch(
				new Request('https://monitor/tick', { method: 'POST', body: String(now) })
			);
			assert.equal(response.status, 200);
			now += step;
		},
		async snapshot() {
			return parseStatus(await (await monitor.fetch(new Request('https://monitor/status'))).json());
		},
		read: () => monitor.fetch(new Request('https://monitor/status')),
		restart() {
			monitor = new PublicMonitor(ctx, env, dependencies);
		},
		rewind() {
			now -= MINUTE;
		},
		advance(step) {
			now += step;
		}
	};
}

test('confirmation needs three failures and two successes, with gaps resetting streaks', () => {
	let state = null;
	const step = (ok, slot) => {
		const next = advance(state, ok, slot);
		state = next.state;
		return next;
	};
	assert.equal(step(true, 0).status, 'degraded');
	assert.equal(step(true, MINUTE).status, 'operational');
	assert.equal(step(false, 2 * MINUTE).changed, false);
	assert.equal(step(false, 3 * MINUTE).status, 'degraded');
	assert.equal(step(false, 4 * MINUTE).status, 'down');
	assert.equal(step(true, 5 * MINUTE).status, 'down');
	assert.equal(step(true, 6 * MINUTE).changed, true);
	step(false, 7 * MINUTE);
	step(false, 8 * MINUTE);
	assert.equal(step(false, 10 * MINUTE).status, 'degraded');
});

test('public requests do not run probes; samples and counters survive restart and duplicate ticks', async () => {
	const h = harness();
	assert.equal((await h.read()).status, 503);
	await h.tick();
	await h.tick();
	h.restart();
	for (let i = 0; i < 10; i++) await h.snapshot();
	h.rewind();
	await h.tick();
	assert.equal(h.calls, 2);
	const snapshot = await h.snapshot();
	assert.equal(snapshot.version, 3);
	assert.equal(snapshot.apps[0].status, 'operational');
	assert.equal(snapshot.apps[0].publicHistory.sampleCount, 2);
	assert.equal(snapshot.monitoring.events.length, 0);
	h.db.close();
});

test('confirmed transitions are persisted and recovery requires two successful scheduled samples', async () => {
	const h = harness();
	await h.tick();
	await h.tick();
	h.set(false);
	await h.tick();
	await h.tick();
	assert.equal((await h.snapshot()).apps[0].status, 'degraded');
	await h.tick();
	h.restart();
	assert.equal((await h.snapshot()).apps[0].status, 'down');
	h.set(true);
	await h.tick();
	assert.equal((await h.snapshot()).apps[0].status, 'down');
	await h.tick();
	const result = await h.snapshot();
	assert.equal(result.apps[0].status, 'operational');
	assert.equal(result.apps[0].publicHistory.sampleCount, 7);
	assert.equal(result.apps[0].publicHistory.history.filter(Boolean).length, 4);
	assert.equal(result.monitoring.events.length, 12);
	assert.equal(freshOriginData(result, Date.now() + 200000).apps[0].publicHistory.sampleCount, 7);
	h.db.close();
});

test('application failures do not overwrite page availability', async () => {
	const h = harness();
	await h.tick();
	await h.tick();
	h.set(false);
	await h.tick();
	await h.tick();
	await h.tick();
	const result = await h.snapshot();
	assert.equal(result.apps.find((app) => app.id === 'agrinova').status, 'down');
	assert.equal(result.apps.find((app) => app.id === 'agrinova').publicStatus, 'operational');
	h.db.close();
});

test('retention excludes expired samples and gaps do not generate fake uptime samples', async () => {
	const h = harness();
	await h.tick();
	await h.tick();
	h.advance(30 * 24 * 60 * MINUTE);
	await h.tick();
	const result = await h.snapshot();
	assert.equal(result.apps[0].publicHistory.sampleCount, 1);
	assert.equal(result.apps[0].publicHistory.history.length, 1);
	assert.ok(result.apps[0].publicHistory.coveragePercent < 1);
	h.db.close();
});

test('email failure retries from durable outbox and delivered events are not sent again', async () => {
	let attempts = 0;
	let failing = true;
	const messages = [];
	const h = harness({
		ALERT_EMAIL_FROM: 'alerts@example.com',
		ALERT_EMAIL_TO: 'owner@example.com',
		EMAIL: {
			async send(message) {
				attempts++;
				if (failing) throw new Error('temporary email failure');
				messages.push(message);
			}
		}
	});
	await h.tick();
	await h.tick();
	h.set(false);
	await h.tick();
	await h.tick();
	await h.tick();
	assert.equal(attempts, 6);
	h.restart();
	failing = false;
	await h.tick();
	assert.equal(messages.length, 6);
	assert.ok((await h.snapshot()).monitoring.events.every((e) => e.delivered));
	await h.tick();
	assert.equal(messages.length, 6);
	assert.ok(
		messages.every(
			(message) => message.to === 'owner@example.com' && message.headers['X-Monitor-Event-ID']
		)
	);
	h.db.close();
});

test('scheduled handler uses singleton binding while public status only reads; no tick route exposed', async () => {
	const requests = [];
	const env = {
		MONITOR: {
			idFromName(name) {
				assert.equal(name, 'public-monitor');
				return 'singleton';
			},
			get() {
				return {
					async fetch(request) {
						requests.push(request);
						return new Response('{}');
					}
				};
			}
		},
		ASSETS: { fetch: async () => new Response('asset', { status: 404 }) }
	};
	await worker.scheduled({ scheduledTime: Date.now() }, env, {});
	await worker.fetch(new Request('https://website/status.json'), env, {});
	assert.deepEqual(
		requests.map((r) => [new URL(r.url).pathname, r.method]),
		[
			['/tick', 'POST'],
			['/status', 'GET']
		]
	);
	assert.equal(
		(await worker.fetch(new Request('https://website/tick', { method: 'POST' }), env, {})).status,
		404
	);
});
