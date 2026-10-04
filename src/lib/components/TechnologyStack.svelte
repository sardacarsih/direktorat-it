<script lang="ts">
	import { Braces, Database, Globe, Smartphone, Webhook } from '@lucide/svelte';
	import {
		siGo,
		siPostgresql,
		siRedis,
		siDocker,
		siLinux,
		siGithub,
		siReact,
		siNextdotjs,
		siSvelte,
		siBun,
		siNodedotjs
	} from 'simple-icons';
	import SectionHeading from './SectionHeading.svelte';
	import { technologies } from '$lib/content';

	const brandPaths: Record<string, string> = {
		GO: siGo.path,
		POSTGRESQL: siPostgresql.path,
		REDIS: siRedis.path,
		DOCKER: siDocker.path,
		LINUX: siLinux.path,
		GITHUB: siGithub.path,
		REACT: siReact.path,
		'NEXT.JS': siNextdotjs.path,
		SVELTE: siSvelte.path,
		BUN: siBun.path,
		'NODE.JS': siNodedotjs.path
	};

	const genericIcons: Record<string, typeof Globe> = {
		'C#': Braces,
		ORACLE: Database,
		WEB: Globe,
		MOBILE: Smartphone,
		API: Webhook
	};
</script>

<section class="section-shell section-space tech-section">
	<SectionHeading
		number="06"
		label="TECHNOLOGY STACK"
		title="PERANGKAT UNTUK MEMBANGUN."
		text="Dari open source hingga enterprise. Teknologi dipilih sesuai kebutuhan, bukan sekadar tren."
	/>
	<div class="tech-tags">
		{#each technologies as tech, i}<span class="tech-tag mono"
				><span class="tag-plus">+</span>
				{#if brandPaths[tech]}
					<svg class="tech-brand-icon" viewBox="0 0 24 24" aria-hidden="true"
						><path d={brandPaths[tech]} /></svg
					>
				{:else if genericIcons[tech]}
					{@const Icon = genericIcons[tech]}
					<Icon size={13} strokeWidth={2} aria-hidden="true" />
				{/if}
				{tech}<span class="tag-index">{String(i + 1).padStart(2, '0')}</span></span
			>{/each}
	</div>
	<p class="data-note mono">
		CLOUD / DATABASE / NETWORK / DEVOPS / SECURITY / AUTOMATION — CONTOH TEKNOLOGI
	</p>
</section>
