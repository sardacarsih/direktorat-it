<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';
	import { portalUrl } from '$lib/content';
	import { systemStatus } from '$lib/status-store';
	import { statusLabels } from '$lib/status';
	const data = $derived($systemStatus.data);
	const status = $derived(
		!data
			? 'unknown'
			: data.apps.every((app) => app.status === 'operational') &&
				  data.host?.status === 'operational' &&
				  data.database?.status === 'operational' &&
				  data.public.status === 'operational'
				? 'operational'
				: data.apps.some((app) => app.status !== 'operational') ||
					  data.public.status !== 'operational' ||
					  (data.host && data.host.status !== 'operational') ||
					  (data.database && data.database.status !== 'operational')
					? 'degraded'
					: 'unknown'
	);
</script>

<footer class="footer">
	<div class="section-shell">
		<div class="footer-top">
			<div>
				<a class="brand footer-brand" href="#beranda"
					><span class="brand-mark">DIT</span><span>DIREKTORAT IT</span></a
				>
				<p class="footer-manifesto">BUILD. SECURE.<br />OPERATE. INNOVATE.</p>
			</div>
			<nav aria-label="Navigasi footer">
				{#each [['TENTANG', '#tentang'], ['LAYANAN', '#layanan'], ['APLIKASI', '#aplikasi'], ['SISTEM', '#sistem'], ['PORTAL LAYANAN', portalUrl], ['KEAMANAN', '#sistem'], ['KONTAK', '#kontak']] as [label, href]}<a
						class="mono"
						{href}>{label}<ArrowUpRight size={15} /></a
					>{/each}
			</nav>
			<div class="footer-metadata mono">
				<a href="#sistem" data-status={status}
					><span class="status-dot"></span>STATUS: {statusLabels[status]}</a
				>
				<span>PEMERIKSAAN SETIAP 60 DETIK</span><span>REGION: ID</span><span
					>{$systemStatus.snapshot?.externalMonitor === false
						? 'MONITOR DARI HOST APLIKASI'
						: $systemStatus.snapshot?.probeLocation === 'development'
							? 'MONITOR PUBLIK DARI HOST DEVELOPMENT'
							: 'MONITOR PUBLIK DARI CLOUDFLARE'}</span
				>
			</div>
		</div>
		<div class="footer-bottom mono">
			<span>© 2026 DIREKTORAT IT</span><span>DIRANCANG UNTUK TERUS BERGERAK.</span><a
				href="#beranda">KEMBALI KE ATAS ↑</a
			>
		</div>
	</div>
</footer>
