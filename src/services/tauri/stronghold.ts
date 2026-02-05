import { appDataDir, join } from '@tauri-apps/api/path'
import { LazyStore } from '@tauri-apps/plugin-store'
import { Stronghold, type Client } from '@tauri-apps/plugin-stronghold'

const vaultStore = new LazyStore('stronghold.json', {
	defaults: {
		vaultPassword: null,
	},
	autoSave: 200,
})

const VAULT_FILE = 'remote-sync.hold'
const CLIENT_NAME = 'stoneflow-remote-sync'
const PROFILE_PREFIX = 'profile:'
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const OP_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, label: string) {
	return Promise.race([
		promise,
		new Promise<T>((_, reject) => {
			setTimeout(() => reject(new Error(`${label}超时`)), OP_TIMEOUT_MS)
		}),
	])
}

async function getVaultPassword() {
	const saved = await vaultStore.get<string>('vaultPassword')
	if (saved) return saved

	const next = `${crypto.randomUUID()}${crypto.randomUUID()}`
	await vaultStore.set('vaultPassword', next)
	await vaultStore.save()
	return next
}

async function resolveVaultPath() {
	const dir = await appDataDir()
	return await join(dir, VAULT_FILE)
}

async function getClient(): Promise<{ stronghold: Stronghold; client: Client }> {
	const password = await getVaultPassword()
	const vaultPath = await resolveVaultPath()
	const stronghold = await withTimeout(Stronghold.load(vaultPath, password), '加载 Stronghold')
	let client
	try {
		client = await withTimeout(stronghold.loadClient(CLIENT_NAME), '读取 Stronghold 客户端')
	} catch {
		client = await withTimeout(stronghold.createClient(CLIENT_NAME), '创建 Stronghold 客户端')
	}
	return { stronghold, client }
}

export async function setRemoteSyncSecret(profileId: string, url: string) {
	const { stronghold, client } = await getClient()
	const store = client.getStore()
	const data = Array.from(encoder.encode(url))
	await withTimeout(store.insert(`${PROFILE_PREFIX}${profileId}`, data), '写入凭据')
	await withTimeout(stronghold.save(), '保存 Stronghold')
}

export async function getRemoteSyncSecret(profileId: string) {
	const { client } = await getClient()
	const store = client.getStore()
	const data = await withTimeout(store.get(`${PROFILE_PREFIX}${profileId}`), '读取凭据')
	if (!data) return null
	return decoder.decode(new Uint8Array(data))
}

export async function removeRemoteSyncSecret(profileId: string) {
	const { stronghold, client } = await getClient()
	const store = client.getStore()
	await withTimeout(store.remove(`${PROFILE_PREFIX}${profileId}`), '删除凭据')
	await withTimeout(stronghold.save(), '保存 Stronghold')
}
