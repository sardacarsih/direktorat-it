export const navigation = [
	['BERANDA', '#beranda'],
	['TENTANG', '#tentang'],
	['LAYANAN', '#layanan'],
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
export const statistics = [
	{ value: 99.98, suffix: '%', label: 'UPTIME SISTEM', decimals: 2 },
	{ value: 24, suffix: '/7', label: 'OPERASIONAL IT', decimals: 0 },
	{ value: 50, suffix: '+', label: 'SISTEM DIGITAL', decimals: 0 },
	{ value: 100, suffix: '%', label: 'MONITORING KEAMANAN', decimals: 0 }
];
export const operations = [
	{
		name: 'CORE NETWORK',
		status: 'OPERASIONAL',
		value: '99.99%',
		label: 'UPTIME',
		metric: 'LATENSI: 12 ms'
	},
	{
		name: 'DATACENTER',
		status: 'OPERASIONAL',
		value: '99.98%',
		label: 'UPTIME',
		metric: 'NODE: 08 / 08'
	},
	{
		name: 'ENTERPRISE APPS',
		status: 'OPERASIONAL',
		value: '99.95%',
		label: 'UPTIME',
		metric: 'INSIDEN: 00'
	},
	{
		name: 'CYBER SECURITY',
		status: 'AKTIF',
		value: '24/7',
		label: 'MONITORING',
		metric: 'PROTEKSI: AKTIF'
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
