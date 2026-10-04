<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import { Activity } from '@lucide/svelte';
	import { statusLabels, type SystemStatus } from '$lib/status';
	import { applicationState, systemStatus } from '$lib/status-store';
	const snapshot = $derived($systemStatus.snapshot);
	const fresh = $derived($systemStatus.fresh);
	const data = $derived($systemStatus.data);
	const external = $derived(snapshot?.externalMonitor ?? true);
	const probeLabel = $derived(
		snapshot?.probeLocation === 'development' ? 'host development' : 'Cloudflare'
	);
	const originChecked = $derived(
		data?.originCheckedAt
			? new Intl.DateTimeFormat('id-ID', {
					timeZone: 'Asia/Jakarta',
					dateStyle: 'medium',
					timeStyle: 'medium'
				}).format(new Date(data.originCheckedAt)) + ' WIB'
			: 'belum tersedia atau tidak terbaru'
	);
	const healthyApps = $derived(
		data?.apps.filter((app) => app.status === 'operational').length ?? 0
	);
	const appState = $derived(applicationState(data));
	const checked = $derived(
		snapshot
			? new Intl.DateTimeFormat('id-ID', {
					timeZone: 'Asia/Jakarta',
					dateStyle: 'medium',
					timeStyle: 'medium'
				}).format(new Date(snapshot.checkedAt)) + ' WIB'
			: 'Menunggu pemeriksaan'
	);
	const cards = $derived([
		{
			name: 'APLIKASI BISNIS',
			status: appState,
			value: data ? `${healthyApps}/${data.apps.length}` : '—',
			label: external ? 'PROBE PUBLIK OPERASIONAL' : 'APLIKASI LOKAL OPERASIONAL',
			detail: external
				? `HTTPS dari ${probeLabel} · halaman / health`
				: 'Service + health check / HTTP'
		},
		{
			name: 'RESOURCE SERVER',
			status: data?.host?.status ?? 'unknown',
			value: data?.host ? `${data.host.cpuPercent.toFixed(1)}%` : '—',
			label: 'PENGGUNAAN CPU',
			detail: data?.host
				? `RAM: ${data.host.ramPercent.toFixed(1)}% · DISK: ${data.host.diskPercent.toFixed(1)}%`
				: 'Data collector server asal belum tersedia'
		},
		{
			name: 'DATABASE',
			status: data?.database?.status ?? 'unknown',
			value: data?.database ? (data.database.status === 'operational' ? 'SIAP' : 'CEK') : '—',
			label: 'POSTGRESQL',
			detail: 'Penerimaan koneksi · collector server asal'
		},
		{
			name: 'AKSES PUBLIK',
			status: data?.public.status ?? 'unknown',
			value: data ? `${data.public.available}/${data.public.total}` : '—',
			label: 'DOMAIN HTTPS TERJANGKAU',
			detail: external ? `Pemeriksaan HTTPS dari ${probeLabel}` : 'Pemeriksaan dari host aplikasi'
		}
	]);
	function label(status: string) {
		return statusLabels[status as SystemStatus | 'unknown'];
	}
</script>

<section id="sistem" class="operations section-space">
	<div class="section-shell">
		<SectionHeading
			number="05"
			label="OPERASIONAL & MONITORING"
			title="SELALU DALAM PANTAUAN."
			text="Pengecekan aplikasi melalui HTTPS publik, dilengkapi metrik server dan database dari collector server asal."
		/>
		<div class="ops-toolbar mono">
			<span><Activity size={16} /> STATUS SISTEM</span><span>CHECK: {checked}</span>
		</div>
		<p class="monitor-message" role="status">
			{fresh
				? 'Data pemeriksaan terbaru · diperbarui setiap 60 detik.'
				: snapshot
					? 'Data status tidak tersedia atau sudah lebih dari 3 menit. Status saat ini belum diketahui.'
					: 'Status belum tersedia. Menunggu hasil pemeriksaan.'}
		</p>
		{#if external}
			<p class="monitor-message">
				Probe publik: {probeLabel} · diperiksa saat dashboard dimuat dan diperbarui setiap 60 detik. Data
				server asal: {originChecked}.
			</p>
		{/if}
		<noscript
			><p class="monitor-message">Aktifkan JavaScript untuk melihat status terbaru.</p></noscript
		>
		<div class="operations-grid">
			{#each cards as item, index}
				<article class="operation-card">
					<div class="mono operation-title"><span>{item.name}</span><span>0{index + 1}</span></div>
					<span class="operation-status mono" data-status={item.status}
						><span class="status-dot"></span>{label(item.status)}</span
					>
					<strong>{item.value}</strong><span class="mono operation-label">{item.label}</span>
					<div class="operation-metric mono">{item.detail}</div>
				</article>
			{/each}
		</div>
		<div class="monitored-apps">
			<h3>Status aplikasi</h3>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable region needs keyboard focus for horizontal navigation.) -->
			<div
				class="status-table-scroll"
				tabindex="0"
				role="region"
				aria-label="Tabel status aplikasi, dapat digeser horizontal"
			>
				<table class="status-table">
					<caption
						>{external
							? `Hasil probe HTTPS dari ${probeLabel}; uptime dan riwayat berasal dari sampel lokal server asal selama 30 hari.`
							: 'Hasil pemeriksaan lokal dan HTTPS publik; uptime berdasarkan sampel lokal selama 30 hari terakhir.'}</caption
					>
					<thead
						><tr
							><th scope="col">Aplikasi</th><th scope="col"
								>{external ? 'Probe publik' : 'Lokal'}</th
							><th scope="col">Halaman HTTPS</th><th scope="col"
								>{external ? 'Respons publik' : 'Respons lokal'}</th
							><th scope="col">Uptime lokal</th><th scope="col">24 pemeriksaan lokal terakhir</th
							></tr
						></thead
					>
					<tbody>
						{#each data?.apps ?? snapshot?.apps ?? [] as app}
							<tr>
								<th scope="row"
									>{app.name}<small
										>{app.checkType === 'http'
											? 'HTTP halaman · fungsi bisnis belum diuji'
											: external
												? 'Endpoint health publik'
												: 'Service + endpoint health'}</small
									></th
								>
								<td
									><span class="operation-status mono" data-status={fresh ? app.status : 'unknown'}
										>{label(fresh ? app.status : 'unknown')}</span
									></td
								>
								<td
									><span
										class="operation-status mono"
										data-status={fresh ? app.publicStatus : 'unknown'}
										>{label(fresh ? app.publicStatus : 'unknown')}</span
									></td
								>
								<td>{fresh && app.latencyMs !== null ? `${app.latencyMs} ms` : '—'}</td>
								<td
									>{fresh && app.uptimePercent !== null
										? `${app.uptimePercent.toFixed(2)}%`
										: '—'}<small
										>{app.sampleCount} sampel lokal · cakupan {app.coveragePercent.toFixed(3)}% / 30
										hari</small
									></td
								>
								<td
									><div
										class="status-history"
										aria-label={`Riwayat lokal ${app.name}: ${app.history.filter(Boolean).length} dari ${app.history.length} pemeriksaan berhasil`}
									>
										{#each app.history as ok}<span class:check-failed={!ok} aria-hidden="true"
											></span>{/each}
									</div></td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
		<div class="ops-footer mono">
			<span
				>{external
					? `PROBE HTTPS DARI ${probeLabel.toUpperCase()}`
					: 'PROBE DARI HOST APLIKASI'}</span
			>
			<span>METRIK & RIWAYAT LOKAL DARI COLLECTOR SERVER ASAL</span>
		</div>
		<p class="monitor-message">
			Probe publik memeriksa respons HTTPS, bukan seluruh fungsi bisnis. CPU, RAM, disk, database,
			uptime, dan riwayat lokal berasal dari collector server asal; data yang lebih lama dari 3
			menit ditandai belum diketahui. Riwayat uptime publik belum disimpan. Status sistem lokal di
			site lain belum dipantau.
		</p>
	</div>
</section>
