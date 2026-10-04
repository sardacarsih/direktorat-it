<script lang="ts">
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import type { BusinessApplication } from '$lib/content';

	let { app }: { app: BusinessApplication } = $props();

	let track: HTMLDivElement | undefined = $state();
	let index = $state(0);

	const images = $derived(app.thumbnails ?? (app.thumbnail ? [app.thumbnail] : []));

	function goTo(i: number) {
		if (!track) return;
		index = Math.max(0, Math.min(images.length - 1, i));
		track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
	}

	function onScroll() {
		if (!track) return;
		index = Math.round(track.scrollLeft / track.clientWidth);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowLeft') goTo(index - 1);
		else if (event.key === 'ArrowRight') goTo(index + 1);
	}
</script>

{#if images.length > 1}
	<div class="application-gallery">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="application-gallery-track"
			role="group"
			aria-label={`Galeri tangkapan layar aplikasi ${app.name}`}
			tabindex="0"
			bind:this={track}
			onscroll={onScroll}
			onkeydown={onKeydown}
		>
			{#each images as src, i}
				<img
					src={src}
					alt={`Tangkapan layar aplikasi ${app.name} (${i + 1} dari ${images.length})`}
					loading={i === 0 ? 'eager' : 'lazy'}
					decoding="async"
					draggable="false"
				/>
			{/each}
		</div>
		<button
			class="gallery-nav gallery-prev"
			type="button"
			aria-label="Gambar sebelumnya"
			onclick={() => goTo(index - 1)}
			disabled={index === 0}
		>
			<ChevronLeft size={16} aria-hidden="true" />
		</button>
		<button
			class="gallery-nav gallery-next"
			type="button"
			aria-label="Gambar berikutnya"
			onclick={() => goTo(index + 1)}
			disabled={index === images.length - 1}
		>
			<ChevronRight size={16} aria-hidden="true" />
		</button>
		<span class="gallery-index mono" aria-live="polite">
			{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
		</span>
	</div>
{:else if images.length === 1}
	<img
		class="application-thumbnail"
		src={images[0]}
		alt={`Tangkapan layar aplikasi ${app.name}`}
		loading="lazy"
		decoding="async"
	/>
{/if}
