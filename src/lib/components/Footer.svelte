<script lang="ts">
	import { ArrowUpRight } from '@lucide/svelte';
	import { portalUrl } from '$lib/content';
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
				{#each [['TENTANG', '#tentang'], ['LAYANAN', '#layanan'], ['SISTEM', '#sistem'], ['PORTAL LAYANAN', portalUrl], ['KEAMANAN', '#sistem'], ['KONTAK', '#kontak']] as [label, href]}<a
						class="mono"
						{href}>{label}<ArrowUpRight size={15} /></a
					>{/each}
			</nav>
			<div class="footer-metadata mono">
				<span><span class="status-dot"></span> STATUS: OPERASIONAL*</span><span
					>VERSION: 2026.10</span
				><span>REGION: ID</span><span>* DATA DEMO</span>
			</div>
		</div>
		<div class="footer-bottom mono">
			<span>© 2026 DIREKTORAT IT</span><span>DIRANCANG UNTUK TERUS BERGERAK.</span><a
				href="#beranda">KEMBALI KE ATAS ↑</a
			>
		</div>
	</div>
</footer>
