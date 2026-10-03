<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import { technologies } from '$lib/content';
</script>

<section class="section-shell section-space tech-section">
	<SectionHeading
		number="05"
		label="TECHNOLOGY STACK"
		title="PERANGKAT UNTUK MEMBANGUN."
		text="Dari open source hingga enterprise. Teknologi dipilih sesuai kebutuhan, bukan sekadar tren."
	/>
	<div class="tech-tags">
		{#each technologies as tech, i}<span class="tech-tag mono"
				><span class="tag-plus">+</span>{tech}<span class="tag-index"
					>{String(i + 1).padStart(2, '0')}</span
				></span
			>{/each}
	</div>
	<p class="data-note mono">
		CLOUD / DATABASE / NETWORK / DEVOPS / SECURITY / AUTOMATION — CONTOH TEKNOLOGI
	</p>
</section>
