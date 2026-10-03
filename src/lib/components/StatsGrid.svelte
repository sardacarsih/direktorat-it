<script lang="ts">
	import { businessApplications, localApplications, services } from '$lib/content';
	const statistics = [
		{
			value: businessApplications.filter((app) => app.platforms.includes('Web')).length,
			label: 'APLIKASI WEB'
		},
		{
			value: businessApplications.filter((app) => app.platforms.includes('Mobile')).length,
			label: 'APLIKASI MOBILE'
		},
		{ value: localApplications.length, label: 'SISTEM LOKAL' },
		{ value: services.length, label: 'KAPABILITAS LAYANAN' }
	];
</script>

<div class="stats-grid">
	{#each statistics as stat}<div class="stat">
			<strong>{stat.value}</strong><span class="mono">{stat.label}</span>
		</div>{/each}
</div>
