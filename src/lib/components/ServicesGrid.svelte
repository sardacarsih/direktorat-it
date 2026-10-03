<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import ServiceCard from './ServiceCard.svelte';
	import { services } from '$lib/content';
</script>

<section id="layanan" class="section-shell section-space services-section">
	<SectionHeading
		number="02"
		label="LAYANAN IT"
		title="YANG KAMI GERAKKAN."
		text="Enam kapabilitas. Satu ekosistem. Dukungan teknologi dari fondasi hingga inovasi."
	/>
	<div class="services-grid">
		{#each services as service, index}<ServiceCard {service} {index} />{/each}
	</div>
</section>
