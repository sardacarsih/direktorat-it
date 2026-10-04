import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { statusResponse } from './worker/monitor';
import type { Connect, Plugin } from 'vite';

function monitoring(): Plugin {
	const middleware: Connect.NextHandleFunction = (request, response, next) => {
		if (request.url?.split('?')[0] !== '/status.json') return next();
		if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
			response.writeHead(405, { Allow: 'GET, HEAD' });
			response.end();
			return;
		}
		void statusResponse(undefined, 'development')
			.then(async (result) => {
				response.writeHead(result.status, Object.fromEntries(result.headers));
				response.end(request.method === 'HEAD' ? undefined : await result.text());
			})
			.catch(() => {
				response.writeHead(503, { 'Cache-Control': 'no-store' });
				response.end();
			});
	};
	return {
		name: 'public-monitoring',
		configureServer(server) {
			server.middlewares.use(middleware);
		},
		configurePreviewServer(server) {
			server.middlewares.use(middleware);
		}
	};
}

export default defineConfig({ plugins: [monitoring(), tailwindcss(), sveltekit()] });
