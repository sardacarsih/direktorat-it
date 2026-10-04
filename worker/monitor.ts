import config from '../deploy/monitoring/config.json' with { type: 'json' };
import {
	parseStatus,
	type ApplicationStatus,
	type StatusSnapshot,
	type SystemStatus
} from '../src/lib/status.ts';

export const ORIGIN_STATUS_URL = 'https://it-origin.kskgroup.web.id/status.json';
const MAX_BODY_BYTES = 65536;
const PROBE_TIMEOUT_MS = 5000;
type Probe = { ok: boolean; latencyMs: number | null };
type Fetcher = typeof fetch;

async function readJson(response: Response): Promise<unknown> {
	const reader = response.body?.getReader();
	if (!reader) throw new Error('Missing response body');
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > MAX_BODY_BYTES) throw new Error('Response too large');
			chunks.push(value);
		}
	} finally {
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return JSON.parse(new TextDecoder().decode(body));
}

async function probe(url: string, fetcher: Fetcher, health = false): Promise<Probe> {
	const started = Date.now();
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
	try {
		const response = await fetcher(url, {
			signal: controller.signal,
			redirect: health ? 'error' : 'follow',
			cache: 'no-store',
			headers: { 'User-Agent': 'DirektoratIT-PublicMonitor/2.0', 'Cache-Control': 'no-cache' }
		});
		let ok = response.ok;
		if (health && ok) {
			const body = (await readJson(response)) as { status?: unknown };
			ok =
				response.headers.get('content-type')?.includes('application/json') === true &&
				body?.status === 'ok';
		} else {
			await response.body?.cancel();
		}
		return { ok, latencyMs: ok ? Date.now() - started : null };
	} catch {
		return { ok: false, latencyMs: null };
	} finally {
		clearTimeout(timeout);
	}
}

async function originSnapshot(fetcher: Fetcher, url: string): Promise<StatusSnapshot | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
	try {
		const response = await fetcher(url, {
			signal: controller.signal,
			cache: 'no-store',
			headers: { 'X-DIT-Origin-Probe': '1', 'Cache-Control': 'no-cache' }
		});
		if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
			await response.body?.cancel();
			return null;
		}
		const data = parseStatus(await readJson(response));
		return data.version === 1 && Date.now() - Date.parse(data.checkedAt) <= 180000 ? data : null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}

function aggregate(statuses: SystemStatus[]): SystemStatus {
	return statuses.every((status) => status === 'operational')
		? 'operational'
		: statuses.every((status) => status === 'down')
			? 'down'
			: 'degraded';
}

export async function collectPublicStatus(
	fetcher: Fetcher = fetch,
	originUrl = ORIGIN_STATUS_URL,
	probeLocation: 'cloudflare' | 'development' = 'cloudflare'
): Promise<StatusSnapshot> {
	const [origin, checks] = await Promise.all([
		originSnapshot(fetcher, originUrl),
		Promise.all(
			config.apps.map(async (app) => {
				const healthUrl = app.publicHealthPath
					? new URL(app.publicHealthPath, app.publicUrl).href
					: null;
				const [page, health] = await Promise.all([
					probe(app.publicUrl, fetcher),
					healthUrl ? probe(healthUrl, fetcher, true) : Promise.resolve(null)
				]);
				return { app, page, check: health ?? page, healthUrl };
			})
		)
	]);
	// Origin metrics and history expire independently of the external probe timestamp.
	const originFresh = origin && Date.now() - Date.parse(origin.checkedAt) <= 180000 ? origin : null;
	const apps: ApplicationStatus[] = checks.map(({ app, page, check, healthUrl }) => {
		const history = originFresh?.apps.find((candidate) => candidate.id === app.id);
		return {
			id: app.id,
			name: app.name,
			status: check.ok ? 'operational' : 'down',
			latencyMs: check.latencyMs,
			publicStatus: page.ok ? 'operational' : 'down',
			publicLatencyMs: page.latencyMs,
			checkType: healthUrl ? 'health' : 'http',
			uptimePercent: history?.uptimePercent ?? null,
			sampleCount: history?.sampleCount ?? 0,
			coveragePercent: history?.coveragePercent ?? 0,
			since: history?.since ?? null,
			history: history?.history ?? []
		};
	});
	return {
		version: 2,
		checkedAt: new Date().toISOString(),
		windowDays: 30,
		probeLocation,
		externalMonitor: true,
		originCheckedAt: originFresh?.checkedAt ?? null,
		apps,
		host: originFresh?.host ?? null,
		database: originFresh?.database ?? null,
		public: {
			status: aggregate(apps.map((app) => app.publicStatus)),
			available: apps.filter((app) => app.publicStatus === 'operational').length,
			total: apps.length
		}
	};
}

export async function statusResponse(
	originUrl = ORIGIN_STATUS_URL,
	probeLocation: 'cloudflare' | 'development' = 'cloudflare'
): Promise<Response> {
	return Response.json(await collectPublicStatus(fetch, originUrl, probeLocation), {
		headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' }
	});
}
