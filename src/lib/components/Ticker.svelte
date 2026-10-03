<script lang="ts">
	import { Pause, Play } from '@lucide/svelte';
	let paused = $state(false);
	const words = [
		'INFRASTRUCTURE',
		'SOFTWARE ENGINEERING',
		'CYBER SECURITY',
		'DATA',
		'CLOUD',
		'DIGITAL TRANSFORMATION'
	];
</script>

<div class="ticker">
	<div class="ticker-window">
		<div class="ticker-track" class:paused>
			{#each [0, 1] as copy}<div class="ticker-copy" aria-hidden={copy === 1 ? 'true' : undefined}>
					{#each words as word}<span>{word}</span><span class="ticker-plus">✳</span>{/each}
				</div>{/each}
		</div>
	</div>
	<button
		aria-label={paused ? 'Jalankan ticker' : 'Jeda ticker'}
		aria-pressed={paused}
		onclick={() => (paused = !paused)}
		>{#if paused}<Play size={17} />{:else}<Pause size={17} />{/if}</button
	>
</div>
