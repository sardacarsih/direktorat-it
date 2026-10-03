<script lang="ts">
	import { ArrowUpRight, Plus } from '@lucide/svelte';
	import { supportOptions, portalUrl } from '$lib/content';
	let selected = $state(0);
</script>

<section id="kontak" class="cta-section">
	<div class="section-shell">
		<div class="cta-layout">
			<div>
				<p class="eyebrow mono">[07] / MARI TERHUBUNG</p>
				<h2>BUTUH<br />DUKUNGAN IT<span>?</span></h2>
				<p>
					Akses layanan, laporkan kendala, atau diskusikan kebutuhan teknologi bersama tim
					Direktorat IT.
				</p>
				<a class="button black" href={portalUrl} target="_blank" rel="noopener"
					>BUKA PORTAL LAYANAN <ArrowUpRight size={21} /></a
				>
			</div>
			<div class="cta-art" aria-hidden="true">
				<Plus size={120} strokeWidth={1} /><span class="mono">LET'S MAKE<br />IT WORK.</span
				><ArrowUpRight size={100} strokeWidth={1} />
			</div>
		</div>
		<div id="dukungan" class="support-panel">
			<div class="support-title">
				<h3>Apa yang bisa kami bantu?</h3>
				<span class="demo-label mono">PORTAL LAYANAN</span>
			</div>
			<div class="support-options">
				{#each supportOptions as item, index}<a
						href={item.url}
						target="_blank"
						rel="noopener"
						class:chosen={selected === index}
						onclick={() => (selected = index)}
						><span class="mono">0{index + 1}</span><strong>{item.title}</strong><ArrowUpRight
							size={20}
						/></a
					>{/each}
			</div>
			<div class="support-detail" aria-live="polite">
				<p><strong>{supportOptions[selected].title}</strong> — {supportOptions[selected].text}</p>
				<p class="mono">
					Setiap pilihan membuka portal layanan resmi. Masuk dengan akun organisasi untuk mengajukan
					tiket dan memantau perkembangannya.
				</p>
			</div>
		</div>
	</div>
</section>
