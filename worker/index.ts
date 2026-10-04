export { PublicMonitor } from './scheduled-monitor.ts';

type Environment = {
	ASSETS: { fetch(request: Request): Promise<Response> };
	ORIGIN_STATUS_URL?: string;
	MONITOR: {
		idFromName(name: string): unknown;
		get(id: unknown): { fetch(request: Request): Promise<Response> };
	};
};
type Context = { waitUntil(promise: Promise<unknown>): void };

export default {
	async scheduled(
		controller: { scheduledTime: number },
		env: Environment,
		_ctx: Context
	): Promise<void> {
		const monitor = env.MONITOR.get(env.MONITOR.idFromName('public-monitor'));
		const result = await monitor.fetch(
			new Request('https://monitor/tick', {
				method: 'POST',
				body: String(controller.scheduledTime)
			})
		);
		if (!result.ok) throw new Error(`Scheduled monitor failed: ${result.status}`);
	},
	async fetch(request: Request, env: Environment, ctx: Context): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname !== '/status.json') return env.ASSETS.fetch(request);
		if (!['GET', 'HEAD'].includes(request.method))
			return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
		// Prevent recursion if the origin hostname is later moved to this Worker.
		if (request.headers.get('X-DIT-Origin-Probe') === '1')
			return new Response('Origin collector unavailable', { status: 503 });
		const monitor = env.MONITOR.get(env.MONITOR.idFromName('public-monitor'));
		const response = await monitor.fetch(
			new Request('https://monitor/status', { method: request.method })
		);
		const result = new Response(request.method === 'HEAD' ? null : response.body, response);
		result.headers.set('Cache-Control', 'no-store, max-age=0');
		return result;
	}
};
