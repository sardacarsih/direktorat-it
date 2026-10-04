<script lang="ts">
	import { ChevronLeft, ChevronRight, Maximize2, X } from '@lucide/svelte';
	import type { BusinessApplication } from '$lib/content';

	let { app }: { app: BusinessApplication } = $props();

	let track: HTMLDivElement | undefined = $state();
	let index = $state(0);
	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);
	let closeButton: HTMLButtonElement | undefined = $state();
	let lastTrigger: HTMLElement | null = null;
	let touchStartX = 0;

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

	function step(delta: number) {
		lightboxIndex = (lightboxIndex + delta + images.length) % images.length;
	}

	function openLightbox(i: number, trigger: EventTarget | null) {
		lastTrigger = trigger instanceof HTMLElement ? trigger : null;
		lightboxIndex = Math.max(0, Math.min(images.length - 1, i));
		lightboxOpen = true;
	}

	function closeLightbox() {
		lightboxOpen = false;
		lastTrigger?.focus();
		lastTrigger = null;
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (!lightboxOpen) return;
		if (event.key === 'Escape') closeLightbox();
		else if (event.key === 'ArrowLeft') step(-1);
		else if (event.key === 'ArrowRight') step(1);
	}

	function onTouchStart(event: TouchEvent) {
		touchStartX = event.touches[0].clientX;
	}

	function onTouchEnd(event: TouchEvent) {
		const delta = event.changedTouches[0].clientX - touchStartX;
		if (Math.abs(delta) > 40) step(delta < 0 ? 1 : -1);
	}

	// Overlay dipindah ke body: transform :hover pada .application-card
	// mengubah acuan position: fixed jika overlay tetap di dalam kartu.
	function portal(node: HTMLElement) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}

	$effect(() => {
		if (!lightboxOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		closeButton?.focus();
		return () => {
			document.body.style.overflow = previous;
		};
	});
</script>

<svelte:window onkeydown={onWindowKeydown} />

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
				<button
					type="button"
					class="application-gallery-slide"
					aria-label={`Perbesar tangkapan layar ${app.name} (${i + 1} dari ${images.length})`}
					onclick={(e) => openLightbox(i, e.currentTarget)}
				>
					<img
						{src}
						alt={`Tangkapan layar aplikasi ${app.name} (${i + 1} dari ${images.length})`}
						loading={i === 0 ? 'eager' : 'lazy'}
						decoding="async"
						draggable="false"
					/>
				</button>
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
		<span class="gallery-zoom mono"><Maximize2 size={12} aria-hidden="true" />PERBESAR</span>
		<span class="gallery-index mono" aria-live="polite">
			{String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
		</span>
	</div>
{:else if images.length === 1}
	<button
		type="button"
		class="application-thumbnail-button"
		aria-label={`Perbesar tangkapan layar ${app.name}`}
		onclick={(e) => openLightbox(0, e.currentTarget)}
	>
		<img
			class="application-thumbnail"
			src={images[0]}
			alt={`Tangkapan layar aplikasi ${app.name}`}
			loading="lazy"
			decoding="async"
		/>
		<span class="gallery-zoom mono"><Maximize2 size={12} aria-hidden="true" />PERBESAR</span>
	</button>
{/if}

{#if lightboxOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="lightbox-overlay"
		role="dialog"
		aria-modal="true"
		aria-label={`Tangkapan layar aplikasi ${app.name}`}
		tabindex="-1"
		use:portal
		onclick={(e) => {
			if (e.target === e.currentTarget) closeLightbox();
		}}
	>
		<button
			class="lightbox-close"
			type="button"
			bind:this={closeButton}
			aria-label="Tutup tampilan penuh"
			onclick={closeLightbox}
		>
			<X size={20} aria-hidden="true" />
		</button>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<figure class="lightbox-frame" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
			<img
				src={images[lightboxIndex]}
				alt={`Tangkapan layar aplikasi ${app.name} (${lightboxIndex + 1} dari ${images.length})`}
				draggable="false"
			/>
			{#if images.length > 1}
				<button
					class="gallery-nav lightbox-prev"
					type="button"
					aria-label="Gambar sebelumnya"
					onclick={() => step(-1)}
				>
					<ChevronLeft size={16} aria-hidden="true" />
				</button>
				<button
					class="gallery-nav lightbox-next"
					type="button"
					aria-label="Gambar berikutnya"
					onclick={() => step(1)}
				>
					<ChevronRight size={16} aria-hidden="true" />
				</button>
			{/if}
			<figcaption class="lightbox-bar mono">
				<span>{app.name}</span>
				<span>
					{String(lightboxIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
				</span>
			</figcaption>
		</figure>
	</div>
{/if}
