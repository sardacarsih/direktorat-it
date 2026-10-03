<script lang="ts">
	import { onMount } from 'svelte';
	import Navbar from '$lib/components/Navbar.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Ticker from '$lib/components/Ticker.svelte';
	import About from '$lib/components/About.svelte';
	import ServicesGrid from '$lib/components/ServicesGrid.svelte';
	import DigitalEcosystem from '$lib/components/DigitalEcosystem.svelte';
	import OperationsDashboard from '$lib/components/OperationsDashboard.svelte';
	import TechnologyStack from '$lib/components/TechnologyStack.svelte';
	import Initiatives from '$lib/components/Initiatives.svelte';
	import CTASection from '$lib/components/CTASection.svelte';
	import Footer from '$lib/components/Footer.svelte';
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries)
					if (entry.isIntersecting) {
						entry.target.animate(
							[
								{ transform: 'translateY(16px)', opacity: 0.5 },
								{ transform: 'translateY(0)', opacity: 1 }
							],
							{ duration: 260, easing: 'ease-out' }
						);
						observer.unobserve(entry.target);
					}
			},
			{ threshold: 0.08 }
		);
		document.querySelectorAll('.section-heading').forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});
</script>

<svelte:head
	><title>Direktorat IT — Infrastruktur Digital yang Andal</title><meta
		name="description"
		content="Direktorat IT: infrastruktur, software engineering, keamanan siber, data, dan operasional untuk ekosistem digital yang andal."
	/><meta name="theme-color" content="#f3f0e8" /><meta
		property="og:title"
		content="Direktorat IT — Infrastruktur Digital yang Andal"
	/><meta
		property="og:description"
		content="Teknologi dengan tujuan. Fondasi digital yang kuat untuk organisasi yang terus bergerak."
	/><meta property="og:type" content="website" /><meta property="og:locale" content="id_ID" /><meta
		name="twitter:card"
		content="summary"
	/><meta name="twitter:title" content="Direktorat IT — Infrastruktur Digital yang Andal" /><meta
		name="twitter:description"
		content="Teknologi dengan tujuan. Fondasi digital yang kuat untuk organisasi yang terus bergerak."
	/></svelte:head
>
<Navbar />
<main id="main">
	<Hero /><Ticker /><About /><ServicesGrid /><DigitalEcosystem /><OperationsDashboard
	/><TechnologyStack /><Initiatives /><CTASection />
</main>
<Footer />
