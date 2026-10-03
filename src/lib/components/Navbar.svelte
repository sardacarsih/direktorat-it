<script lang="ts">
	import { Menu, X, ArrowUpRight } from '@lucide/svelte';
	import { navigation, portalUrl } from '$lib/content';
	let open = $state(false);
	let toggle: HTMLButtonElement;
	function close(returnFocus = false) {
		open = false;
		if (returnFocus) toggle?.focus();
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && open) close(true);
	}}
/>
<a class="skip-link" href="#main">Lewati ke konten utama</a>
<header class="navbar">
	<a class="brand" href="#beranda"
		><span class="brand-mark">DIT<span class="brand-pixel"></span></span><span
			>DIREKTORAT<span class="brand-it"> IT</span></span
		></a
	>
	<nav class="desktop-nav" aria-label="Navigasi utama">
		{#each navigation as [label, href]}<a {href}>{label}</a>{/each}
	</nav>
	<div class="nav-right">
		<span class="nav-status mono"><span class="status-dot"></span>SISTEM AKTIF</span><a
			href={portalUrl}
			target="_blank"
			rel="noopener"
			class="nav-cta mono">MASUK PORTAL <ArrowUpRight size={16} /></a
		>
	</div>
	<button
		class="menu-toggle"
		bind:this={toggle}
		aria-label={open ? 'Tutup menu' : 'Buka menu'}
		aria-expanded={open}
		aria-controls="mobile-menu"
		onclick={() => (open = !open)}
		>{#if open}<X />{:else}<Menu />{/if}</button
	>
	<nav id="mobile-menu" class:menu-open={open} class="mobile-nav" aria-label="Navigasi mobile">
		{#each navigation as [label, href]}<a {href} onclick={() => close()}
				>{label}<ArrowUpRight size={18} /></a
			>{/each}
	</nav>
</header>
