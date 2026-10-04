import { derived, readable } from 'svelte/store';
import { freshOriginData, parseStatus, type StatusSnapshot, type SystemStatus } from './status';

type State = { snapshot: StatusSnapshot | null; now: number; failed: boolean };
const source = readable<State>({ snapshot: null, now: 0, failed: false }, (set) => {
	if (typeof window === 'undefined') return;
	let state: State = { snapshot: null, now: Date.now(), failed: false };
	let stopped = false;
	let controller: AbortController | null = null;
	set(state);
	async function refresh() {
		controller?.abort();
		const request = new AbortController();
		controller = request;
		const timeout = setTimeout(() => request.abort(), 10000);
		try {
			const response = await fetch('/status.json', { cache: 'no-store', signal: request.signal });
			if (!response.ok) throw new Error('Status unavailable');
			const body = await response.text();
			if (body.length > 65536) throw new Error('Status too large');
			const snapshot = parseStatus(JSON.parse(body));
			if (!stopped) {
				state = { snapshot, now: Date.now(), failed: false };
				set(state);
			}
		} catch {
			if (!stopped) {
				state = { ...state, now: Date.now(), failed: true };
				set(state);
			}
		} finally {
			clearTimeout(timeout);
		}
	}
	void refresh();
	const polling = setInterval(() => void refresh(), 60000);
	const aging = setInterval(() => {
		state = { ...state, now: Date.now() };
		set(state);
	}, 15000);
	return () => {
		stopped = true;
		controller?.abort();
		clearInterval(polling);
		clearInterval(aging);
	};
});

export const systemStatus = derived(source, (state) => {
	const fresh =
		state.snapshot !== null &&
		!state.failed &&
		state.now - Date.parse(state.snapshot.checkedAt) <= 180000;
	return {
		...state,
		fresh,
		data: fresh && state.snapshot ? freshOriginData(state.snapshot, state.now) : null
	};
});

export function applicationState(data: StatusSnapshot | null): SystemStatus | 'unknown' {
	if (!data) return 'unknown';
	if (data.apps.every((app) => app.status === 'operational')) return 'operational';
	return data.apps.every((app) => app.status === 'down') ? 'down' : 'degraded';
}
