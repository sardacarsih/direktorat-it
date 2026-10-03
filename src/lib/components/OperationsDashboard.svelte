<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import { operations } from '$lib/content';
	import { Activity } from '@lucide/svelte';
</script>

<section id="sistem" class="operations section-space">
	<div class="section-shell">
		<SectionHeading
			number="05"
			label="OPERASIONAL & MONITORING"
			title="SELALU DALAM PANTAUAN."
			text="Visibilitas di setiap lapisan. Karena keandalan bukan sebuah kebetulan."
		/>
		<div class="ops-toolbar mono">
			<span><Activity size={16} /> NETWORK OPERATIONS CENTER</span><span
				>DATA DEMO / CHECK: 12:45:32 WIB</span
			>
		</div>
		<div class="operations-grid">
			{#each operations as item, index}<article class="operation-card">
					<div class="mono operation-title"><span>{item.name}</span><span>0{index + 1}</span></div>
					<span class="operation-status mono"><span class="status-dot"></span>{item.status}</span
					><strong>{item.value}</strong><span class="mono operation-label">{item.label}</span>
					<div class="sparkline" aria-hidden="true">
						{#each Array.from({ length: 24 }, (_, i) => 20 + ((i * 17 + index * 11) % 48)) as height}<span
								style={`height:${height}%`}
							></span>{/each}
					</div>
					<div class="operation-metric mono">{item.metric}</div>
				</article>{/each}
		</div>
		<div class="ops-footer mono">
			<span><span class="status-dot"></span> ILUSTRASI SISTEM OPERASIONAL</span><span
				>TIMESTAMP TETAP · BUKAN MONITORING LIVE</span
			>
		</div>
	</div>
</section>
