<script lang="ts">
	let {
		number,
		label,
		title,
		text = ''
	} = $props<{ number: string; label: string; title: string; text?: string }>();
</script>

<div class="section-heading">
	<div>
		<p class="eyebrow mono"><span>[{number}]</span> / {label}</p>
		<h2>{title}</h2>
	</div>
	{#if text}<p class="section-description">{text}</p>{/if}
</div>
