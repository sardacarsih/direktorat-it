import { ORIGIN_STATUS_URL, statusResponse } from './monitor.ts';

type Environment = {
	ASSETS: { fetch(request: Request): Promise<Response> };
	ORIGIN_STATUS_URL?: string;
};
type Context = { waitUntil(promise: Promise<unknown>): void };

export default {
	async fetch(request: Request, env: Environment, ctx: Context): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname !== '/status.json') return env.ASSETS.fetch(request);
		if (!['GET', 'HEAD'].includes(request.method))
			return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
		// Prevent recursion if the origin hostname is later moved to this Worker.
		if (request.headers.get('X-DIT-Origin-Probe') === '1')
			return new Response('Origin collector unavailable', { status: 503 });
		const cacheKey = new Request(new URL('/status.json', url.origin).href);
		const cache = await caches.open('dit-public-status-v2');
		let response = await cache.match(cacheKey);
		if (!response) {
			response = await statusResponse(env.ORIGIN_STATUS_URL ?? ORIGIN_STATUS_URL);
			const cached = new Response(response.clone().body, response);
			cached.headers.set('Cache-Control', 'public, max-age=30');
			ctx.waitUntil(cache.put(cacheKey, cached));
		}
		const result = new Response(request.method === 'HEAD' ? null : response.body, response);
		result.headers.set('Cache-Control', 'no-store, max-age=0');
		return result;
	}
};
