export type SystemStatus = 'operational' | 'degraded' | 'down';
export type ApplicationStatus = {
	id: string;
	name: string;
	status: SystemStatus;
	publicStatus: SystemStatus;
	latencyMs: number | null;
	publicLatencyMs: number | null;
	checkType: 'http' | 'health';
	uptimePercent: number | null;
	sampleCount: number;
	coveragePercent: number;
	since: string | null;
	history: boolean[];
};
export type StatusSnapshot = {
	version: 1;
	checkedAt: string;
	windowDays: number;
	probeLocation: 'same-host';
	externalMonitor: false;
	apps: ApplicationStatus[];
	host: { status: SystemStatus; cpuPercent: number; ramPercent: number; diskPercent: number };
	database: { status: SystemStatus; checkType: 'accepting-connections' };
	public: { status: SystemStatus; available: number; total: number };
};
export const statusLabels: Record<SystemStatus | 'unknown', string> = {
	operational: 'OPERASIONAL',
	degraded: 'TERGANGGU',
	down: 'TIDAK TERSEDIA',
	unknown: 'BELUM DIKETAHUI'
};
export function parseStatus(value: unknown): StatusSnapshot {
	const status = (v: unknown) => ['operational', 'degraded', 'down'].includes(String(v));
	const percentage = (v: unknown) =>
		typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
	const latency = (v: unknown) =>
		v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0);
	const timestamp = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
	const data = value as StatusSnapshot;
	if (
		!data ||
		data.version !== 1 ||
		!timestamp(data.checkedAt) ||
		Date.parse(data.checkedAt) > Date.now() + 60000 ||
		data.windowDays !== 30 ||
		data.probeLocation !== 'same-host' ||
		data.externalMonitor !== false ||
		!Array.isArray(data.apps) ||
		data.apps.length !== 6 ||
		new Set(data.apps.map((app) => app?.id)).size !== 6 ||
		!data.apps.every(
			(app) =>
				app &&
				typeof app.id === 'string' &&
				typeof app.name === 'string' &&
				app.name.length <= 60 &&
				status(app.status) &&
				status(app.publicStatus) &&
				latency(app.latencyMs) &&
				latency(app.publicLatencyMs) &&
				['http', 'health'].includes(app.checkType) &&
				(app.uptimePercent === null || percentage(app.uptimePercent)) &&
				Number.isInteger(app.sampleCount) &&
				app.sampleCount >= 0 &&
				percentage(app.coveragePercent) &&
				(app.since === null || timestamp(app.since)) &&
				Array.isArray(app.history) &&
				app.history.length <= 24 &&
				app.history.every((ok) => typeof ok === 'boolean')
		) ||
		!data.host ||
		!status(data.host.status) ||
		![data.host.cpuPercent, data.host.ramPercent, data.host.diskPercent].every(percentage) ||
		!data.database ||
		!status(data.database.status) ||
		data.database.checkType !== 'accepting-connections' ||
		!data.public ||
		!status(data.public.status) ||
		!Number.isInteger(data.public.available) ||
		data.public.total !== data.apps.length ||
		data.public.available < 0 ||
		data.public.available > data.public.total
	)
		throw new Error('Invalid status snapshot');
	return data;
}
