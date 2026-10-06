// Minimal Firebase Cloud Messaging HTTP v1 client for Workers: service account JWT (RS256)
// via WebCrypto, OAuth access token cached per account, topic messages only.
export type ServiceAccount = { project_id: string; client_email: string; private_key: string };
type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

const base64url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
const encodeJson = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));

export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
	if (!raw) return null;
	try {
		const account = JSON.parse(raw) as ServiceAccount;
		return account.project_id && account.client_email && account.private_key ? account : null;
	} catch {
		return null;
	}
}

export async function signJwt(account: ServiceAccount, nowSeconds: number): Promise<string> {
	const der = Uint8Array.from(
		atob(account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')),
		(char) => char.charCodeAt(0)
	);
	const key = await crypto.subtle.importKey(
		'pkcs8',
		der,
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign']
	);
	const unsigned = `${encodeJson({ alg: 'RS256', typ: 'JWT' })}.${encodeJson({
		iss: account.client_email,
		scope: SCOPE,
		aud: TOKEN_URL,
		iat: nowSeconds,
		exp: nowSeconds + 3600
	})}`;
	const signature = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		new TextEncoder().encode(unsigned)
	);
	return `${unsigned}.${base64url(new Uint8Array(signature))}`;
}

async function describe(response: Response) {
	const detail = (
		await response.text().catch((error: unknown) => `body-unreadable: ${String(error)}`)
	).slice(0, 300);
	return `${response.status} content-type=${response.headers.get('content-type') ?? '-'} ${detail}`;
}

export function createFcmClient(fetcher: Fetcher, now: () => number) {
	const tokens = new Map<string, { token: string; expires: number }>();
	async function accessToken(account: ServiceAccount) {
		const cached = tokens.get(account.client_email);
		if (cached && cached.expires - 5 * 60000 > now()) return cached.token;
		const response = await fetcher(TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: await signJwt(account, Math.floor(now() / 1000))
			}).toString()
		});
		if (!response.ok) throw new Error(`OAuth ${await describe(response)}`);
		const body = (await response.json()) as { access_token: string; expires_in: number };
		tokens.set(account.client_email, {
			token: body.access_token,
			expires: now() + body.expires_in * 1000
		});
		return body.access_token;
	}
	return {
		async sendTopic(account: ServiceAccount, message: Record<string, unknown>) {
			const token = await accessToken(account);
			const response = await fetcher(
				`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
				{
					method: 'POST',
					headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
					body: JSON.stringify({ message })
				}
			);
			if (response.status === 401) tokens.delete(account.client_email);
			if (!response.ok) throw new Error(`FCM ${await describe(response)}`);
		}
	};
}
