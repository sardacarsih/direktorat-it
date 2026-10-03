<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import { Activity } from '@lucide/svelte';
	import { statusLabels, type SystemStatus } from '$lib/status';
	import { applicationState, systemStatus } from '$lib/status-store';
	const snapshot = $derived($systemStatus.snapshot);
	const fresh = $derived($systemStatus.fresh);
	const data = $derived($systemStatus.data);
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
			label: 'APLIKASI LOKAL OPERASIONAL',
			detail: 'Service + health check / HTTP'
		},
		{
			name: 'RESOURCE SERVER',
			status: data?.host.status ?? 'unknown',
			value: data ? `${data.host.cpuPercent.toFixed(1)}%` : '—',
			label: 'PENGGUNAAN CPU',
			detail: data
				? `RAM: ${data.host.ramPercent.toFixed(1)}% · DISK: ${data.host.diskPercent.toFixed(1)}%`
				: 'Menunggu data resource'
		},
		{
			name: 'DATABASE',
			status: data?.database.status ?? 'unknown',
			value: data ? (data.database.status === 'operational' ? 'SIAP' : 'CEK') : '—',
			label: 'POSTGRESQL',
			detail: 'Pemeriksaan penerimaan koneksi'
		},
		{
			name: 'AKSES PUBLIK',
			status: data?.public.status ?? 'unknown',
			value: data ? `${data.public.available}/${data.public.total}` : '—',
			label: 'DOMAIN HTTPS TERJANGKAU',
			detail: 'Pemeriksaan dari host yang sama'
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
			text="Pemeriksaan layanan, resource server, database, dan akses aplikasi setiap menit."
		/>
		<div class="ops-toolbar mono">
			<span><Activity size={16} /> STATUS SISTEM</span><span>CHECK: {checked}</span>
		</div>
		<p class="monitor-message" role="status">
			{fresh
				? 'Data pemeriksaan terbaru · diperbarui setiap 60 detik.'
				: snapshot
					? 'Data status tidak tersedia atau sudah lebih dari 3 menit. Status saat ini belum diketahui.'
					: 'Status belum tersedia. Menunggu data pemeriksaan server.'}
		</p>
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
						>Hasil pemeriksaan lokal dan HTTPS publik; uptime berdasarkan sampel lokal selama 30
						hari terakhir.</caption
					>
					<thead
						><tr
							><th scope="col">Aplikasi</th><th scope="col">Lokal</th><th scope="col"
								>HTTPS publik</th
							><th scope="col">Respons lokal</th><th scope="col">Uptime teramati</th><th scope="col"
								>24 pemeriksaan terakhir</th
							></tr
						></thead
					>
					<tbody>
						{#each snapshot?.apps ?? [] as app}
							<tr>
								<th scope="row"
									>{app.name}<small
										>{app.checkType === 'http'
											? 'HTTP halaman · fungsi bisnis belum diuji'
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
										>{app.sampleCount} sampel · cakupan {app.coveragePercent.toFixed(3)}% / 30 hari</small
									></td
								>
								<td
									><div
										class="status-history"
										aria-label={`Riwayat ${app.name}: ${app.history.filter(Boolean).length} dari ${app.history.length} pemeriksaan berhasil`}
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
			<span>LOKAL + HTTPS DARI HOST YANG SAMA</span><span
				>PEMERIKSAAN EKSTERNAL BELUM TERHUBUNG</span
			>
		</div>
		<p class="monitor-message">
			Gangguan seluruh host memerlukan monitor dari server terpisah. Status sistem lokal di lokasi
			lain belum dipantau. Uptime teramati hanya mencakup sampel yang terkumpul; jeda pemeriksaan
			belum dihitung sebagai uptime.
		</p>
	</div>
</section>
