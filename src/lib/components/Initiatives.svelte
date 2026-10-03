<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import { initiatives } from '$lib/content';
	import { ArrowUpRight } from '@lucide/svelte';
</script>

<section class="initiatives-section section-space">
	<div class="section-shell">
		<SectionHeading
			number="06"
			label="INISIATIF DIGITAL"
			title="LANGKAH KE DEPAN."
			text="Arah pengembangan untuk ekosistem digital yang semakin matang. Ilustrasi inisiatif Direktorat IT."
		/>
		<div class="initiatives-grid">
			{#each initiatives as item, i}<article class="initiative">
					<div class={`initiative-number ${item.color}`}>
						0{i + 1}<ArrowUpRight size={42} strokeWidth={1.4} />
					</div>
					<div class="initiative-content">
						<span class="mono">{item.category}</span>
						<h3>{item.title}</h3>
						<p>{item.description}</p>
					</div>
				</article>{/each}
		</div>
	</div>
</section>
