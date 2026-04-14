import type { VaultEntryDto } from '@/infra/api/vault'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const VAULT_VALUE_PREFIX = 'stoneflow-vault:v1:'
const EXPORT_BUNDLE_FORMAT = 'stoneflow-vault-export'
const EXPORT_BUNDLE_VERSION = 1
const EXPORT_PBKDF2_ITERATIONS = 210_000

type EncryptedVaultValuePayload = {
	version: 1
	algorithm: 'AES-GCM'
	iv: string
	ciphertext: string
}

type VaultExportPayload = {
	entries: VaultEntryDto[]
	exportedAt: number
}

type VaultExportBundle = {
	format: typeof EXPORT_BUNDLE_FORMAT
	version: typeof EXPORT_BUNDLE_VERSION
	exportedAt: number
	kdf: {
		name: 'PBKDF2'
		hash: 'SHA-256'
		iterations: number
		salt: string
	}
	encryption: {
		name: 'AES-GCM'
		iv: string
		ciphertext: string
	}
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = ''
	const chunkSize = 0x8000
	for (let index = 0; index < bytes.length; index += chunkSize) {
		const chunk = bytes.subarray(index, index + chunkSize)
		binary += String.fromCharCode(...chunk)
	}
	return btoa(binary)
}

function base64ToBytes(base64: string) {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return bytes
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength)
	copy.set(bytes)
	return copy.buffer
}

function parseHexKey(key: string) {
	if (!/^[0-9a-f]{64}$/i.test(key)) {
		throw new Error('Vault 主密钥格式无效')
	}

	const bytes = new Uint8Array(32)
	for (let index = 0; index < key.length; index += 2) {
		bytes[index / 2] = Number.parseInt(key.slice(index, index + 2), 16)
	}
	return bytes
}

async function importVaultAesKey(key: string) {
	return await crypto.subtle.importKey('raw', toArrayBuffer(parseHexKey(key)), 'AES-GCM', false, ['encrypt', 'decrypt'])
}

async function encryptText(plaintext: string, key: string) {
	const aesKey = await importVaultAesKey(key)
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const encrypted = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		aesKey,
		encoder.encode(plaintext),
	)

	return {
		iv: bytesToBase64(iv),
		ciphertext: bytesToBase64(new Uint8Array(encrypted)),
	}
}

async function decryptText(payload: { iv: string; ciphertext: string }, key: string) {
	const aesKey = await importVaultAesKey(key)
	const decrypted = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: toArrayBuffer(base64ToBytes(payload.iv)),
		},
		aesKey,
		toArrayBuffer(base64ToBytes(payload.ciphertext)),
	)

	return decoder.decode(decrypted)
}

async function deriveExportKey(password: string, salt: Uint8Array) {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		toArrayBuffer(encoder.encode(password)),
		'PBKDF2',
		false,
		['deriveKey'],
	)
	return await crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: toArrayBuffer(salt),
			iterations: EXPORT_PBKDF2_ITERATIONS,
			hash: 'SHA-256',
		},
		baseKey,
		{
			name: 'AES-GCM',
			length: 256,
		},
		false,
		['encrypt', 'decrypt'],
	)
}

function assertBundlePassword(password: string) {
	if (!password.trim()) {
		throw new Error('导入或导出的加密密码不能为空')
	}
}

export function isEncryptedVaultValue(value: string) {
	return value.startsWith(VAULT_VALUE_PREFIX)
}

export async function encryptVaultValue(plaintext: string, masterKey: string) {
	const encrypted = await encryptText(plaintext, masterKey)
	const payload: EncryptedVaultValuePayload = {
		version: 1,
		algorithm: 'AES-GCM',
		iv: encrypted.iv,
		ciphertext: encrypted.ciphertext,
	}
	return `${VAULT_VALUE_PREFIX}${JSON.stringify(payload)}`
}

export async function decryptVaultValue(value: string, masterKey: string) {
	if (!isEncryptedVaultValue(value)) {
		return value
	}

	const rawPayload = value.slice(VAULT_VALUE_PREFIX.length)
	let payload: EncryptedVaultValuePayload
	try {
		payload = JSON.parse(rawPayload) as EncryptedVaultValuePayload
	} catch {
		throw new Error('Vault 密文格式损坏，无法解析')
	}

	if (payload.version !== 1 || payload.algorithm !== 'AES-GCM') {
		throw new Error('Vault 密文版本不受支持')
	}

	try {
		return await decryptText(payload, masterKey)
	} catch {
		throw new Error('Vault 密文解密失败，请确认本地解锁材料有效')
	}
}

export async function exportVaultEntriesBundle(entries: VaultEntryDto[], password: string) {
	assertBundlePassword(password)
	const payload: VaultExportPayload = {
		entries,
		exportedAt: Date.now(),
	}
	const salt = crypto.getRandomValues(new Uint8Array(16))
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const key = await deriveExportKey(password, salt)
	const encrypted = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		encoder.encode(JSON.stringify(payload)),
	)

	const bundle: VaultExportBundle = {
		format: EXPORT_BUNDLE_FORMAT,
		version: EXPORT_BUNDLE_VERSION,
		exportedAt: payload.exportedAt,
		kdf: {
			name: 'PBKDF2',
			hash: 'SHA-256',
			iterations: EXPORT_PBKDF2_ITERATIONS,
			salt: bytesToBase64(salt),
		},
		encryption: {
			name: 'AES-GCM',
			iv: bytesToBase64(iv),
			ciphertext: bytesToBase64(new Uint8Array(encrypted)),
		},
	}

	return JSON.stringify(bundle, null, 2)
}

export async function importVaultEntriesBundle(raw: string, password: string) {
	assertBundlePassword(password)
	let bundle: VaultExportBundle
	try {
		bundle = JSON.parse(raw) as VaultExportBundle
	} catch {
		throw new Error('导入文件不是合法的 JSON')
	}

	if (bundle.format !== EXPORT_BUNDLE_FORMAT || bundle.version !== EXPORT_BUNDLE_VERSION) {
		throw new Error('导入文件格式不受支持')
	}

	const key = await deriveExportKey(password, base64ToBytes(bundle.kdf.salt))
	let decrypted: ArrayBuffer
	try {
		decrypted = await crypto.subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: toArrayBuffer(base64ToBytes(bundle.encryption.iv)),
			},
			key,
			toArrayBuffer(base64ToBytes(bundle.encryption.ciphertext)),
		)
	} catch {
		throw new Error('导入密码不正确，或导入文件已损坏')
	}

	let payload: VaultExportPayload
	try {
		payload = JSON.parse(decoder.decode(decrypted)) as VaultExportPayload
	} catch {
		throw new Error('导入文件内容损坏，无法恢复 Vault 条目')
	}

	if (!Array.isArray(payload.entries)) {
		throw new Error('导入文件缺少有效的 Vault 条目数据')
	}

	return payload
}
