import { appDataDir, join } from '@tauri-apps/api/path'
import { LazyStore } from '@tauri-apps/plugin-store'
import { Stronghold, type Client } from '@tauri-apps/plugin-stronghold'

// Stronghold 只负责敏感密钥，不能用前端 UI 持久化机制替代。
const vaultStore = new LazyStore('stronghold.json', {
	defaults: {
		vaultPassword: null,
	},
	autoSave: 200,
})

const VAULT_FILE = 'remote-sync.hold'
const CLIENT_NAME = 'stoneflow-remote-sync'
const PROFILE_PREFIX = 'profile:'
const VAULT_MASTER_KEY = 'vault:master-key'
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const OP_TIMEOUT_MS = 20000

let clientPromise: Promise<{ stronghold: Stronghold; client: Client }> | null = null

function log(...args: unknown[]) {
	// console.log('[stronghold]', ...args)
	void args
}

function logError(...args: unknown[]) {
	// console.error('[stronghold]', ...args)
	void args
}

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
	log('vault:password:created')
	return next
}

async function resolveVaultPath() {
	const dir = await appDataDir()
	const path = await join(dir, VAULT_FILE)
	log('vault:path', path)
	return path
}

async function loadClient(): Promise<{ stronghold: Stronghold; client: Client }> {
	log('client:load:start')
	const password = await getVaultPassword()
	const vaultPath = await resolveVaultPath()
	const stronghold = await withTimeout(Stronghold.load(vaultPath, password), '加载 Stronghold')
	let client
	try {
		client = await withTimeout(stronghold.loadClient(CLIENT_NAME), '读取 Stronghold 客户端')
	} catch {
		client = await withTimeout(stronghold.createClient(CLIENT_NAME), '创建 Stronghold 客户端')
	}
	log('client:load:done')
	return { stronghold, client }
}

async function getClient() {
	if (!clientPromise) {
		log('client:get:build')
		clientPromise = loadClient()
	}
	try {
		return await clientPromise
	} catch (error) {
		logError('client:get:error', error)
		clientPromise = null
		throw error
	}
}

async function setSecret(key: string, value: string) {
	const { stronghold, client } = await getClient()
	const store = client.getStore()
	const data = Array.from(encoder.encode(value))
	await withTimeout(store.insert(key, data), '写入 Stronghold 密钥')
	await withTimeout(stronghold.save(), '保存 Stronghold')
}

async function getSecret(key: string) {
	const { client } = await getClient()
	const store = client.getStore()
	const data = await withTimeout(store.get(key), '读取 Stronghold 密钥')
	if (!data) return null
	return decoder.decode(new Uint8Array(data))
}

async function removeSecret(key: string) {
	const { stronghold, client } = await getClient()
	const store = client.getStore()
	await withTimeout(store.remove(key), '删除 Stronghold 密钥')
	await withTimeout(stronghold.save(), '保存 Stronghold')
}

export async function setRemoteSyncSecret(profileId: string, url: string) {
	log('secret:set:start', { profileId, length: url.trim().length })
	await setSecret(`${PROFILE_PREFIX}${profileId}`, url)
	log('secret:set:done', { profileId })
}

export async function getRemoteSyncSecret(profileId: string) {
	log('secret:get:start', { profileId })
	const result = await getSecret(`${PROFILE_PREFIX}${profileId}`)
	if (!result) return null
	log('secret:get:done', { profileId, length: result.length })
	return result
}

export async function removeRemoteSyncSecret(profileId: string) {
	log('secret:remove:start', { profileId })
	await removeSecret(`${PROFILE_PREFIX}${profileId}`)
	log('secret:remove:done', { profileId })
}

export async function getVaultMasterKey() {
	return await getSecret(VAULT_MASTER_KEY)
}

export async function ensureVaultMasterKey() {
	const existing = await getVaultMasterKey()
	if (existing) return existing

	const raw = crypto.getRandomValues(new Uint8Array(32))
	const created = Array.from(raw, (item) => item.toString(16).padStart(2, '0')).join('')
	await setSecret(VAULT_MASTER_KEY, created)
	return created
}
