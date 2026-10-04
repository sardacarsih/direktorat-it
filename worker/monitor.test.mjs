import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../deploy/monitoring/config.json' with { type: 'json' };
import { collectPublicStatus, ORIGIN_STATUS_URL } from './monitor.ts';
import { freshOriginData, parseStatus } from '../src/lib/status.ts';
import worker from './index.ts';

function origin(age = 0) {
	return {
		version: 1,
		checkedAt: new Date(Date.now() - age).toISOString(),
		windowDays: 30,
		probeLocation: 'same-host',
		externalMonitor: false,
		apps: config.apps.map((app) => ({
			id: app.id,
			name: app.name,
			status: 'down',
			publicStatus: 'down',
			latencyMs: null,
			publicLatencyMs: null,
			checkType: 'http',
			uptimePercent: 40,
			sampleCount: 5,
			coveragePercent: 0.01,
			since: new Date(Date.now() - 600000).toISOString(),
			history: [true, false, false, false, true]
		})),
		host: { status: 'operational', cpuPercent: 12, ramPercent: 20, diskPercent: 30 },
		database: { status: 'operational', checkType: 'accepting-connections' },
		public: { status: 'down', available: 0, total: 6 }
	};
}

function fetcher(source, exceptions = {}) {
	return async (url, options) => {
		assert.equal(options.cache, 'no-store');
		if (String(url) === ORIGIN_STATUS_URL) {
			assert.equal(options.headers['X-DIT-Origin-Probe'], '1');
			return Response.json(source);
		}
		if (exceptions[String(url)]) return exceptions[String(url)]();
		if (String(url).endsWith('/health/live')) {
			assert.equal(options.redirect, 'manual');
			return Response.json({ status: 'ok' });
		}
		return new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } });
	};
}

test('public probes override same-host results while retaining independently dated origin metrics', async () => {
	const source = origin();
	const snapshot = parseStatus(await collectPublicStatus(fetcher(source)));
	assert.equal(snapshot.probeLocation, 'cloudflare');
	assert.equal(snapshot.externalMonitor, true);
	assert.equal(snapshot.originCheckedAt, source.checkedAt);
	assert.equal(snapshot.public.available, 6);
	assert.equal(snapshot.host.cpuPercent, 12);
	assert.ok(snapshot.apps.every((app) => app.status === 'operational'));
	assert.ok(snapshot.apps.every((app) => app.uptimePercent === 40));
	assert.equal(snapshot.apps.find((app) => app.id === 'mops').checkType, 'health');
	assert.equal(snapshot.apps.find((app) => app.id === 'inventory').checkType, 'health');
	assert.equal(snapshot.apps.find((app) => app.id === 'agrinova').checkType, 'health');
	assert.equal(snapshot.apps.find((app) => app.id === 'eofficepro').checkType, 'health');
	assert.equal(snapshot.apps.find((app) => app.id === 'hris').checkType, 'http');
	assert.equal(snapshot.apps.find((app) => app.id === 'opal').checkType, 'http');
});

test('stale or malformed origin data does not prevent independent public checks', async () => {
	for (const source of [origin(181000), { version: 1 }, null]) {
		const snapshot = parseStatus(await collectPublicStatus(fetcher(source)));
		assert.equal(snapshot.public.available, 6);
		assert.equal(snapshot.originCheckedAt, null);
		assert.equal(snapshot.host, null);
		assert.equal(snapshot.database, null);
		assert.ok(snapshot.apps.every((app) => app.uptimePercent === null && app.history.length === 0));
	}
});

test('HTML with HTTP 200 cannot pass JSON health checks; backend and page availability remain separate', async () => {
	const snapshot = await collectPublicStatus(
		fetcher(origin(), {
			'https://mops.kskgroup.web.id/health/live': () => new Response('<html>Login</html>')
		})
	);
	const app = snapshot.apps.find((app) => app.id === 'mops');
	assert.equal(app.status, 'down');
	assert.equal(app.publicStatus, 'operational');
	assert.equal(app.latencyMs, null);
	assert.equal(snapshot.public.available, 6);
});

test('all four liveness endpoints require JSON status ok independently of page availability', async () => {
	for (const id of ['agrinova', 'mops', 'eofficepro', 'inventory']) {
		const app = config.apps.find((candidate) => candidate.id === id);
		const healthUrl = new URL('/health/live', app.publicUrl).href;
		for (const response of [
			() => Response.json({ status: 'down' }),
			() => Response.json({ status: 'ok' }, { status: 503 }),
			() => Response.json({ status: 'ok' }, { status: 302, headers: { Location: '/login' } }),
			() => new Response('{"status":"ok"}', { headers: { 'Content-Type': 'text/html' } }),
			() => new Response('<html>Login</html>', { headers: { 'Content-Type': 'text/html' } })
		]) {
			const snapshot = await collectPublicStatus(fetcher(origin(), { [healthUrl]: response }));
			const result = snapshot.apps.find((candidate) => candidate.id === id);
			assert.equal(result.status, 'down');
			assert.equal(result.checkType, 'health');
			assert.equal(result.publicStatus, 'operational');
			assert.equal(result.latencyMs, null);
			assert.equal(snapshot.public.available, 6);
			assert.ok(
				snapshot.apps
					.filter((candidate) => candidate.id !== id)
					.every((candidate) => candidate.status === 'operational')
			);
		}
	}
});

test('origin network failure and an unavailable public app do not discard other probe results', async () => {
	const snapshot = await collectPublicStatus(async (url, options) => {
		if (String(url) === ORIGIN_STATUS_URL) throw new Error('Origin offline');
		return fetcher(null, {
			'https://agrinova.kskgroup.web.id': () => new Response('Unavailable', { status: 503 })
		})(url, options);
	});
	assert.equal(snapshot.public.status, 'degraded');
	assert.equal(snapshot.public.available, 5);
	assert.equal(snapshot.apps.find((app) => app.id === 'agrinova').status, 'operational');
	assert.equal(snapshot.apps.find((app) => app.id === 'agrinova').publicStatus, 'down');
	assert.equal(snapshot.host, null);
});

test('origin metrics expire even while the external snapshot remains fresh', async () => {
	const source = origin(170000);
	const snapshot = await collectPublicStatus(fetcher(source));
	const current = freshOriginData(snapshot, Date.now() + 15000);
	assert.equal(current.host, null);
	assert.equal(current.database, null);
	assert.equal(current.originCheckedAt, null);
	assert.ok(current.apps.every((app) => app.uptimePercent === null && app.history.length === 0));
	assert.equal(current.public.available, 6);
});

test('legacy snapshots remain supported, and mismatched external provenance is rejected', async () => {
	const source = origin();
	assert.deepEqual(parseStatus(source), source);
	const snapshot = await collectPublicStatus(fetcher(source));
	assert.throws(() => parseStatus({ ...snapshot, externalMonitor: false }));
	assert.throws(() => parseStatus({ ...snapshot, probeLocation: 'same-host' }));
	assert.throws(() => parseStatus({ ...snapshot, originCheckedAt: 'invalid' }));
});

test('worker routes assets, rejects recursive origin probes and blocks write methods', async () => {
	const env = { ASSETS: { fetch: async () => new Response('asset') } };
	const ctx = { waitUntil() {} };
	assert.equal(
		await (await worker.fetch(new Request('https://website/'), env, ctx)).text(),
		'asset'
	);
	assert.equal(
		(
			await worker.fetch(
				new Request('https://website/status.json', {
					headers: { 'X-DIT-Origin-Probe': '1' }
				}),
				env,
				ctx
			)
		).status,
		503
	);
	assert.equal(
		(await worker.fetch(new Request('https://website/status.json', { method: 'POST' }), env, ctx))
			.status,
		405
	);
});
