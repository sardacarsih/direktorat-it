<script lang="ts">
	import { onMount } from 'svelte';
	import { statistics } from '$lib/content';
	let element: HTMLDivElement;
	let progress = $state(1);
	onMount(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let frame = 0;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				observer.disconnect();
				const start = performance.now();
				const tick = (now: number) => {
					progress = Math.min((now - start) / 650, 1);
					if (progress < 1) frame = requestAnimationFrame(tick);
				};
				progress = 0;
				frame = requestAnimationFrame(tick);
			},
			{ threshold: 0.35 }
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			cancelAnimationFrame(frame);
		};
	});
</script>

<div class="stats-grid" bind:this={element}>
	{#each statistics as stat}<div class="stat">
			<strong
				><span class="sr-only">{stat.value}{stat.suffix}</span><span aria-hidden="true"
					>{(stat.value * progress).toFixed(stat.decimals)}<span class="stat-suffix"
						>{stat.suffix}</span
					></span
				></strong
			><span class="mono">{stat.label}</span>
		</div>{/each}
</div>
