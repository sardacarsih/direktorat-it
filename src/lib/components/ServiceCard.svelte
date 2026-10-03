<script lang="ts">
	import { Network, Code, Shield, Database, Activity, Zap, ArrowUpRight } from '@lucide/svelte';
	import { services } from '$lib/content';
	let { service, index } = $props<{ service: (typeof services)[number]; index: number }>();
	const icons = {
		network: Network,
		code: Code,
		shield: Shield,
		database: Database,
		activity: Activity,
		zap: Zap
	};
	const Icon = $derived(icons[service.icon as keyof typeof icons]);
</script>

<article class="service-card">
	<div class="card-top">
		<span class="mono">[{String(index + 1).padStart(2, '0')}]</span><span
			class={`icon-box ${service.color}`}><Icon size={26} strokeWidth={1.5} /></span
		>
	</div>
	<h3>{service.title}</h3>
	<p>{service.description}</p>
	<div class="service-tags mono">{service.tags}<br />{service.detail}</div>
	<a class="card-link mono" href="#kontak" aria-label={`Jelajahi layanan ${service.title}`}
		>JELAJAHI <ArrowUpRight size={21} /></a
	>
</article>
