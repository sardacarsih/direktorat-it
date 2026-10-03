export const navigation = [
	['BERANDA', '#beranda'],
	['TENTANG', '#tentang'],
	['LAYANAN', '#layanan'],
	['APLIKASI', '#aplikasi'],
	['SISTEM', '#sistem'],
	['TIM', '#tim'],
	['KONTAK', '#kontak']
];
export const services = [
	{
		title: 'Infrastruktur',
		icon: 'network',
		description: 'Fondasi yang tangguh untuk setiap koneksi dan operasi bisnis.',
		tags: 'Network / Cloud / Server',
		detail: 'Datacenter / Connectivity',
		color: 'lime'
	},
	{
		title: 'Software Engineering',
		icon: 'code',
		description: 'Membangun aplikasi yang menyelesaikan kebutuhan nyata.',
		tags: 'Platform / Aplikasi / API',
		detail: 'Integrasi / Automation',
		color: 'blue'
	},
	{
		title: 'Cyber Security',
		icon: 'shield',
		description: 'Melindungi identitas, informasi, dan seluruh ekosistem digital.',
		tags: 'Identity / Monitoring',
		detail: 'Vulnerability / Response',
		color: 'orange'
	},
	{
		title: 'Data & Analytics',
		icon: 'database',
		description: 'Mengubah data menjadi wawasan dan keputusan yang tepat.',
		tags: 'Data Platform / Dashboard',
		detail: 'Analytics / Intelligence',
		color: 'yellow'
	},
	{
		title: 'Operasional IT',
		icon: 'activity',
		description: 'Menjaga sistem tetap berjalan. Setiap hari, setiap saat.',
		tags: 'Service Desk / Monitoring',
		detail: 'Incident / Maintenance',
		color: 'cream'
	},
	{
		title: 'Transformasi Digital',
		icon: 'zap',
		description: 'Membuka kemungkinan baru melalui teknologi dan inovasi.',
		tags: 'Modernisasi / Arsitektur',
		detail: 'Automation / Innovation',
		color: 'lime'
	}
];
export const ecosystem = [
	{
		id: 'business',
		title: 'BISNIS',
		subtitle: 'Tujuan & kebutuhan',
		description: 'Kebutuhan organisasi menjadi titik awal setiap keputusan teknologi.'
	},
	{
		id: 'apps',
		title: 'APLIKASI',
		subtitle: 'Layanan digital',
		description: 'Platform dan aplikasi menghubungkan proses kerja dengan pengguna.'
	},
	{
		id: 'data',
		title: 'DATA',
		subtitle: 'Informasi',
		description: 'Data terintegrasi mendukung pelaporan, analisis, dan keputusan bisnis.'
	},
	{
		id: 'api',
		title: 'API',
		subtitle: 'Integrasi',
		description: 'API menghubungkan layanan melalui pertukaran data yang terstruktur.'
	},
	{
		id: 'auth',
		title: 'AUTH',
		subtitle: 'Identitas',
		description: 'Manajemen identitas menjaga akses sesuai peran dan kebutuhan pengguna.'
	},
	{
		id: 'infra',
		title: 'INFRASTRUKTUR',
		subtitle: 'Fondasi teknologi',
		description: 'Jaringan, server, cloud, dan datacenter menopang seluruh layanan digital.'
	}
];
export const initiatives = [
	{
		title: 'Enterprise Platform',
		description: 'Modernisasi aplikasi bisnis internal untuk cara kerja yang lebih terhubung.',
		category: 'SOFTWARE ENGINEERING',
		color: 'blue'
	},
	{
		title: 'Data Platform',
		description: 'Fondasi analitik terintegrasi untuk keputusan berbasis data.',
		category: 'DATA & ANALYTICS',
		color: 'lime'
	},
	{
		title: 'Zero Trust Security',
		description: 'Penguatan identitas dan akses di setiap lapisan organisasi.',
		category: 'CYBER SECURITY',
		color: 'orange'
	},
	{
		title: 'Modernisasi Infrastruktur',
		description: 'Infrastruktur yang adaptif, skalabel, dan siap untuk pertumbuhan.',
		category: 'INFRASTRUCTURE',
		color: 'yellow'
	}
];
export type BusinessApplication = {
	name: string;
	platforms: ('Web' | 'Mobile' | 'Lokal')[];
	url?: string;
	coverage?: string;
	description?: string;
};

export const businessApplications: BusinessApplication[] = [
	{
		name: 'Agrinova',
		platforms: ['Web', 'Mobile'],
		url: 'https://agrinova.kskgroup.web.id',
		description:
			'Platform operasional kebun sawit untuk pencatatan panen, gate check, persetujuan, monitoring, dan pelaporan. Mobile mendukung kerja offline dengan sinkronisasi saat koneksi tersedia.'
	},
	{
		name: 'MOPS',
		platforms: ['Web', 'Mobile'],
		url: 'https://mops.kskgroup.web.id',
		description:
			'Platform operasional dan pelaporan PKS untuk konsolidasi transaksi timbang dan grading dari SmartMill Scale, laporan produksi harian, serta monitoring manajemen melalui web dan mobile.'
	},
	{
		name: 'eOfficePro',
		platforms: ['Web', 'Mobile'],
		url: 'https://eofficepro.kskgroup.web.id',
		description:
			'Sistem surat menyurat internal digital untuk pembuatan surat berbasis template, persetujuan berjenjang, disposisi, pelacakan status, dan pencarian arsip melalui web dan aplikasi Android.'
	},
	{
		name: 'Inventory',
		platforms: ['Web', 'Mobile'],
		url: 'https://inventori.kskgroup.web.id',
		description:
			'Sistem inventori terpusat untuk pengelolaan master barang, pemantauan saldo stok antar lokasi, permintaan dan penerimaan barang divisi, serta sinkronisasi data dengan sistem lokal.'
	},
	{ name: 'HRIS', platforms: ['Web', 'Mobile'], url: 'https://hris.kskgroup.web.id' },
	{ name: 'OPAL', platforms: ['Web', 'Mobile'], url: 'https://opal.kskgroup.web.id' }
];

export const localApplications: BusinessApplication[] = [
	{
		name: 'Accounting',
		platforms: ['Lokal'],
		coverage: 'Setiap lokasi',
		description:
			'Aplikasi desktop akuntansi untuk pencatatan jurnal, General Ledger, pengelolaan akun, aset tetap dan penyusutan, serta laporan dan ekspor data.'
	},
	{
		name: 'Finance',
		platforms: ['Lokal'],
		coverage: 'Setiap lokasi',
		description:
			'Aplikasi desktop payroll agronomi untuk pengelolaan BKM, penggajian harian dan bulanan, premi, tunjangan, potongan termasuk BPJS, serta laporan penggajian.'
	},
	{
		name: 'Kasir',
		platforms: ['Lokal'],
		coverage: 'Setiap lokasi',
		description: 'Aplikasi desktop kasir untuk operasional lokal di setiap lokasi.'
	},
	{ name: 'HRIS Lokal', platforms: ['Lokal'], coverage: 'Setiap lokasi' },
	{
		name: 'SmartMill Scale',
		platforms: ['Lokal'],
		coverage: 'Setiap PKS',
		description:
			'Aplikasi desktop untuk timbang masuk dan keluar, pembacaan perangkat timbangan, grading, cetak tiket, serta laporan dan ekspor PDF/Excel.'
	}
];

export const technologies = [
	'GO',
	'POSTGRESQL',
	'ORACLE',
	'REDIS',
	'DOCKER',
	'KUBERNETES',
	'LINUX',
	'GRAFANA',
	'GITHUB',
	'WEB',
	'MOBILE',
	'API'
];
export const portalUrl = 'https://itportal.kskgroup.web.id';
export const supportOptions = [
	{
		title: 'Laporkan insiden',
		text: 'Gangguan koneksi, aplikasi, atau akses sistem.',
		url: `${portalUrl}/tiket/baru`
	},
	{
		title: 'Ajukan kebutuhan',
		text: 'Permintaan layanan, sistem, atau dukungan teknologi.',
		url: `${portalUrl}/tiket/baru`
	},
	{
		title: 'Konsultasi IT',
		text: 'Diskusikan integrasi, keamanan, dan inisiatif digital.',
		url: `${portalUrl}/tiket/baru`
	}
];
