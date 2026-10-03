<script lang="ts">
	import { ArrowUpRight, ArrowDown, Globe, Terminal } from '@lucide/svelte';
	import { portalUrl } from '$lib/content';
</script>

<section id="beranda" class="hero section-shell">
	<div class="hero-top mono">
		<span><span class="status-dot"></span> DIREKTORAT TEKNOLOGI INFORMASI</span><span
			class="hero-coordinate">06°12′ S / 106°49′ E</span
		>
	</div>
	<div class="hero-layout">
		<div class="hero-copy">
			<h1>
				MEMBANGUN<br /><span class="hero-long">INFRASTRUKTUR</span><br /><span class="highlight"
					>DIGITAL</span
				><br />YANG ANDAL<span class="blue-text">.</span>
			</h1>
			<p>
				Kami merancang, membangun, mengamankan, dan mengoperasikan teknologi yang menggerakkan
				organisasi.
			</p>
			<div class="hero-actions">
				<a class="button blue" href="#layanan">JELAJAHI LAYANAN <ArrowUpRight size={20} /></a><a
					class="text-link mono"
					href="#sistem">LIHAT SISTEM <ArrowUpRight size={18} /></a
				><a class="text-link mono" href={portalUrl} target="_blank" rel="noopener"
					>MASUK PORTAL <ArrowUpRight size={18} /></a
				>
			</div>
		</div>
		<div class="hero-visual">
			<div class="orbit-label mono">TERHUBUNG. TERLINDUNGI. TERINTEGRASI.</div>
			<div class="technical-art" aria-hidden="true">
				<div class="art-axis axis-x"></div>
				<div class="art-axis axis-y"></div>
				<div class="orbit orbit-one"></div>
				<div class="orbit orbit-two"></div>
				<div class="orbit orbit-three"></div>
				<div class="art-core"><Globe size={66} strokeWidth={1.3} /></div>
				<span class="art-node node-one"></span><span class="art-node node-two"></span><span
					class="art-node node-three"
				></span><span class="art-tag mono">DIT—001</span><span class="art-cross">+</span>
			</div>
			<div class="terminal-panel">
				<div class="terminal-heading mono">
					<span><Terminal size={15} /> STATUS SISTEM</span><span class="demo-label">DATA DEMO</span>
				</div>
				<div class="terminal-body">
					{#each ['NETWORK', 'DATACENTER', 'APPLICATIONS', 'SECURITY'] as item}<div
							class="terminal-row mono"
						>
							<span>{item}</span><span><i></i>{item === 'SECURITY' ? 'AKTIF' : 'ONLINE'}</span>
						</div>{/each}
					<div class="terminal-bottom">
						<div><span class="mono">UPTIME</span><strong>99.98<span>%</span></strong></div>
						<div class="last-check mono">
							LAST CHECK<br /><b>12:45:32 WIB</b><br /><span>CONTOH / 03.10.2026</span>
						</div>
					</div>
				</div>
				<div class="terminal-foot mono">&gt; SEMUA NODE TERHUBUNG<span class="cursor">_</span></div>
			</div>
		</div>
	</div>
	<div class="hero-bottom mono">
		<span>BUILD / SECURE / OPERATE / INNOVATE</span><a href="#tentang"
			>SCROLL UNTUK EKSPLORASI <ArrowDown size={15} /></a
		><span class="region">REGION: ID <span class="status-dot"></span></span>
	</div>
</section>
