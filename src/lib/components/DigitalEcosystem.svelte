<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import { ecosystem } from '$lib/content';
	import { ArrowDown, ArrowUpRight } from '@lucide/svelte';
	let selected = $state('apps');
	const active = $derived(ecosystem.find((node) => node.id === selected)!);
</script>

<section class="ecosystem-section section-space">
	<div class="section-shell">
		<SectionHeading number="03" label="EKOSISTEM DIGITAL" title="TERHUBUNG SECARA DESAIN." />
		<div class="ecosystem-layout">
			<div class="ecosystem-copy">
				<span class="mono small-label">BUKAN SISTEM YANG BERDIRI SENDIRI.</span>
				<h3>Satu arsitektur.<br />Banyak kemungkinan.</h3>
				<p>
					Setiap lapisan bekerja bersama. Bisnis menentukan arah, aplikasi menghadirkan layanan, dan
					infrastruktur menjaga semuanya tetap berjalan.
				</p>
				<p class="mono interaction-hint">PILIH NODE UNTUK EKSPLORASI <ArrowUpRight size={16} /></p>
				<div class="node-detail" aria-live="polite">
					<span class="mono">NODE / {active.title}</span>
					<p>{active.description}</p>
				</div>
			</div>
			<div class="diagram" role="group" aria-label="Arsitektur ekosistem digital">
				<span class="diagram-label mono">DIT / ARCHITECTURE MAP v.01</span
				>{#each [ecosystem[0], ecosystem[1]] as node}<button
						class="diagram-node"
						class:selected={selected === node.id}
						aria-pressed={selected === node.id}
						onclick={() => (selected = node.id)}
						><strong>{node.title}</strong><span class="mono">{node.subtitle}</span></button
					>
					<div class="connector"><ArrowDown size={16} /></div>{/each}
				<div class="diagram-branches">
					{#each ecosystem.slice(2, 5) as node}<button
							class="diagram-node"
							class:selected={selected === node.id}
							aria-pressed={selected === node.id}
							onclick={() => (selected = node.id)}
							><strong>{node.title}</strong><span class="mono">{node.subtitle}</span></button
						>{/each}
				</div>
				<div class="connector"><ArrowDown size={16} /></div>
				<button
					class="diagram-node infra-node"
					class:selected={selected === 'infra'}
					aria-pressed={selected === 'infra'}
					onclick={() => (selected = 'infra')}
					><strong>INFRASTRUKTUR</strong><span class="mono">Fondasi teknologi</span></button
				><span class="diagram-foot mono"><span class="status-dot"></span> CONNECTED BY DESIGN</span>
			</div>
		</div>
	</div>
</section>
