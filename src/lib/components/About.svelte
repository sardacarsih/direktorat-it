<script lang="ts">
	import SectionHeading from './SectionHeading.svelte';
	import StatsGrid from './StatsGrid.svelte';
	import { ArrowDownRight } from '@lucide/svelte';
</script>

<section id="tentang" class="section-shell section-space">
	<SectionHeading
		number="01"
		label="TENTANG KAMI"
		title="TEKNOLOGI DENGAN TUJUAN."
		text="Teknologi yang baik bukan sekadar berjalan. Ia membuka ruang untuk organisasi bekerja lebih baik."
	/>
	<div class="about-content">
		<div class="purpose-box">
			<ArrowDownRight size={64} strokeWidth={1.5} /><span class="mono"
				>ENGINEERED FOR<br />WHAT'S NEXT.</span
			>
		</div>
		<div>
			<p class="about-lead">Fondasi digital yang kuat.<br />Dampak yang nyata.</p>
			<p>
				Direktorat IT menghadirkan layanan teknologi yang andal, aman, dan skalabel untuk mendukung
				operasional bisnis dan transformasi digital. Dari koneksi pertama hingga inovasi berikutnya,
				kami ada di setiap lapisan.
			</p>
			<div id="tim" class="team-line">
				<span class="mono">SATU TIM. ENAM KAPABILITAS.</span>
				<p>
					Infrastruktur · Software Engineering · Cyber Security · Data & Analytics · Operasional IT
					· Transformasi Digital
				</p>
			</div>
		</div>
	</div>
	<StatsGrid />
	<p class="data-note mono">* Statistik merupakan data demo untuk ilustrasi kapabilitas.</p>
</section>
