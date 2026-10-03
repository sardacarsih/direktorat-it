<script lang="ts">
	import { ArrowUpRight, Monitor, Smartphone, MapPin } from '@lucide/svelte';
	import { businessApplications, localApplications } from '$lib/content';
	import SectionHeading from './SectionHeading.svelte';
</script>

<section id="aplikasi" class="applications-section section-space">
	<div class="section-shell">
		<SectionHeading
			number="04"
			label="APLIKASI & SISTEM BISNIS"
			title="SISTEM UNTUK KERJA NYATA."
			text="Dukungan aplikasi melalui web, perangkat mobile, dan sistem lokal di setiap lokasi."
		/>
		<div class="application-group" aria-labelledby="digital-apps-title">
			<div class="application-group-heading">
				<h3 id="digital-apps-title">Aplikasi Web & Mobile</h3>
				<span class="mono">WEB / MOBILE</span>
			</div>
			<div class="applications-grid">
				{#each businessApplications as app, index}
					<article class="application-card">
						<div class="application-card-top">
							<span class="application-index mono">{String(index + 1).padStart(2, '0')}</span>
							<div class="application-platforms">
								{#each app.platforms as platform}
									<span class="application-badge mono" class:mobile={platform === 'Mobile'}>
										{#if platform === 'Web'}<Monitor
												size={13}
												aria-hidden="true"
											/>{:else}<Smartphone size={13} aria-hidden="true" />{/if}
										{platform}
									</span>
								{/each}
							</div>
						</div>
						<h4>{app.name}</h4>
						{#if app.description}
							<p class="application-description">{app.description}</p>
						{/if}
						{#if app.url}
							<a
								class="application-link mono"
								href={app.url}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={`Buka aplikasi ${app.name} (tab baru)`}
							>
								BUKA APLIKASI <ArrowUpRight size={18} aria-hidden="true" />
							</a>
						{:else}
							<p class="application-access mono">AKSES MELALUI MOBILE APP</p>
						{/if}
					</article>
				{/each}
			</div>
		</div>
		<div class="application-group" aria-labelledby="local-apps-title">
			<div class="application-group-heading">
				<h3 id="local-apps-title">Aplikasi Lokal per Lokasi</h3>
				<span class="mono">LOKASI / PKS</span>
			</div>
			<div class="applications-grid local-applications-grid">
				{#each localApplications as app}
					<article class="application-card local-application-card">
						<span class="application-badge local mono"
							><Monitor size={13} aria-hidden="true" />Lokal</span
						>
						<h4>{app.name}</h4>
						{#if app.description}
							<p class="application-description">{app.description}</p>
						{/if}
						<p class="application-coverage">
							<MapPin size={15} aria-hidden="true" />{app.coverage}
						</p>
					</article>
				{/each}
			</div>
		</div>
	</div>
</section>
