import test from 'node:test';
import assert from 'node:assert/strict';
import { createFcmClient, parseServiceAccount, signJwt } from './fcm.ts';

export async function testServiceAccount(projectId = 'demo-project') {
	const keys = await crypto.subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256'
		},
		true,
		['sign', 'verify']
	);
	const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keys.privateKey));
	const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
	return {
		publicKey: keys.publicKey,
		json: JSON.stringify({
			type: 'service_account',
			project_id: projectId,
			client_email: `push@${projectId}.iam.gserviceaccount.com`,
			private_key: pem
		})
	};
}

const decode = (part) =>
	Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

test('service account parsing rejects missing or invalid JSON', () => {
	assert.equal(parseServiceAccount(undefined), null);
	assert.equal(parseServiceAccount('not json'), null);
	assert.equal(parseServiceAccount('{"project_id":"x"}'), null);
});

test('JWT is signed with the service account key and carries the FCM scope', async () => {
	const sa = await testServiceAccount();
	const jwt = await signJwt(parseServiceAccount(sa.json), 1000);
	const [header, payload, signature] = jwt.split('.');
	assert.ok(
		await crypto.subtle.verify(
			'RSASSA-PKCS1-v1_5',
			sa.publicKey,
			decode(signature),
			new TextEncoder().encode(`${header}.${payload}`)
		)
	);
	const claims = JSON.parse(new TextDecoder().decode(decode(payload)));
	assert.equal(claims.scope, 'https://www.googleapis.com/auth/firebase.messaging');
	assert.equal(claims.exp - claims.iat, 3600);
});

test('access token is cached until near expiry and sent to the project endpoint', async () => {
	const sa = parseServiceAccount((await testServiceAccount('agrinova-app')).json);
	let now = 0;
	const calls = [];
	const client = createFcmClient(
		async (url, init) => {
			calls.push({ url, init });
			if (url.startsWith('https://oauth2'))
				return Response.json({ access_token: 'tok', expires_in: 3600 });
			return Response.json({ name: 'msg' });
		},
		() => now
	);
	await client.sendTopic(sa, { topic: 'service-status' });
	await client.sendTopic(sa, { topic: 'service-status' });
	now = 56 * 60000;
	await client.sendTopic(sa, { topic: 'service-status' });
	assert.equal(calls.filter((c) => c.url.startsWith('https://oauth2')).length, 2);
	const send = calls.find((c) => c.url.startsWith('https://fcm'));
	assert.equal(send.url, 'https://fcm.googleapis.com/v1/projects/agrinova-app/messages:send');
	assert.equal(send.init.headers.Authorization, 'Bearer tok');
});
