<script lang="ts">
	import { ArrowUpRight, ArrowDown, Globe, Terminal } from '@lucide/svelte';
	import { portalUrl } from '$lib/content';
	import { applicationState, systemStatus } from '$lib/status-store';
	import { statusLabels, type SystemStatus } from '$lib/status';
	const data = $derived($systemStatus.data);
	const checked = $derived($systemStatus.snapshot?.checkedAt);
	const appState = $derived(applicationState(data));
	const rows: { name: string; status: SystemStatus | 'unknown' }[] = $derived([
		{ name: 'AKSES PUBLIK', status: data?.public.status ?? 'unknown' },
		{ name: 'SERVER', status: data?.host.status ?? 'unknown' },
		{ name: 'APLIKASI', status: appState },
		{ name: 'DATABASE', status: data?.database.status ?? 'unknown' }
	]);
	const uptime = $derived(
		data && data.apps.every((app) => app.uptimePercent !== null)
			? Math.min(...data.apps.map((app) => app.uptimePercent!))
			: null
	);
	const coverage = $derived(data ? Math.min(...data.apps.map((app) => app.coveragePercent)) : null);
	const checkTime = $derived(
		checked
			? new Intl.DateTimeFormat('id-ID', {
					timeZone: 'Asia/Jakarta',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hourCycle: 'h23'
				}).format(new Date(checked)) + ' WIB'
			: '—'
	);
	const checkDate = $derived(
		checked
			? new Intl.DateTimeFormat('id-ID', {
					timeZone: 'Asia/Jakarta',
					day: '2-digit',
					month: '2-digit',
					year: 'numeric'
				}).format(new Date(checked))
			: 'Menunggu data'
	);
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
					<span><Terminal size={15} /> STATUS SISTEM</span><span class="demo-label"
						>{$systemStatus.fresh ? 'LIVE' : checked ? 'DATA STALE' : 'MENUNGGU'}</span
					>
				</div>
				<div class="terminal-body">
					{#each rows as item}<div class="terminal-row mono">
							<span>{item.name}</span><span data-status={item.status}
								><i aria-hidden="true"></i>{statusLabels[item.status]}</span
							>
						</div>{/each}
					<div class="terminal-bottom">
						<div>
							<span class="mono">UPTIME APLIKASI · MIN</span><strong
								>{uptime === null ? '—' : uptime.toFixed(2)}{#if uptime !== null}<span>%</span
									>{/if}</strong
							>
						</div>
						<div class="last-check mono">
							LAST CHECK<br /><b>{checkTime}</b><br /><span>{checkDate}</span>
						</div>
					</div>
					<p class="terminal-coverage mono">
						{coverage === null
							? 'Data belum tersedia atau tidak terbaru.'
							: `CAKUPAN MIN: ${coverage.toFixed(3)}% / 30 HARI`}
					</p>
					<noscript
						><p class="terminal-coverage mono">
							Aktifkan JavaScript untuk status terbaru.
						</p></noscript
					>
				</div>
				<a class="terminal-foot mono" href="#sistem"
					>&gt; {!data
						? 'STATUS BELUM DIKETAHUI'
						: rows.every((row) => row.status === 'operational')
							? 'PEMERIKSAAN NORMAL · LIHAT DETAIL'
							: 'TERDAPAT GANGGUAN · LIHAT DETAIL'}<span class="cursor">_</span></a
				>
			</div>
		</div>
	</div>
	<div class="hero-bottom mono">
		<span>BUILD / SECURE / OPERATE / INNOVATE</span><a href="#tentang"
			>SCROLL UNTUK EKSPLORASI <ArrowDown size={15} /></a
		><span class="region">REGION: ID <span class="status-dot"></span></span>
	</div>
</section>
