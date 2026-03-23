import { tauriInvoke } from '@/services/tauri/invoke'
import { ensureVaultMasterKey } from '@/services/tauri/stronghold'
import {
	decryptVaultValue,
	encryptVaultValue,
	exportVaultEntriesBundle,
	importVaultEntriesBundle,
	isEncryptedVaultValue,
} from '@/services/assets/vault-crypto'

export type VaultEntryType = 'api_key' | 'token' | 'password' | 'config'

export type VaultEntryDto = {
	id: string
	name: string
	type: VaultEntryType
	environment: string | null
	value: string
	folder: string | null
	note: string | null
	tags: string[]
	favorite: boolean
	syncState: string
	createdAt: number
	updatedAt: number
}

type VaultEntryPersistedDto = VaultEntryDto

async function listVaultEntriesRaw(): Promise<VaultEntryPersistedDto[]> {
	return await tauriInvoke<VaultEntryPersistedDto[]>('list_vault_entries')
}

async function updateVaultEntryRaw(id: string, patch: Partial<VaultEntryPersistedDto>): Promise<void> {
	await tauriInvoke<void>('update_vault_entry', {
		args: { id, patch },
	})
}

async function createVaultEntryRaw(data: {
	name: string
	type: VaultEntryType
	environment?: string | null
	value: string
	folder?: string | null
	note?: string | null
	tags?: string[]
	favorite?: boolean
}): Promise<VaultEntryPersistedDto> {
	return await tauriInvoke<VaultEntryPersistedDto>('create_vault_entry', {
		args: {
			name: data.name,
			type: data.type,
			environment: data.environment ?? null,
			value: data.value,
			folder: data.folder ?? null,
			note: data.note ?? null,
			tags: data.tags ?? [],
			favorite: data.favorite ?? false,
		},
	})
}

async function resolveVaultEntry(entry: VaultEntryPersistedDto, masterKey: string): Promise<VaultEntryDto> {
	const plaintextValue = await decryptVaultValue(entry.value, masterKey)

	if (!isEncryptedVaultValue(entry.value)) {
		const encryptedValue = await encryptVaultValue(plaintextValue, masterKey)
		await updateVaultEntryRaw(entry.id, {
			value: encryptedValue,
			syncState: 'local',
		})
	}

	return {
		...entry,
		value: plaintextValue,
	}
}

export async function ensureVaultUnlocked() {
	return await ensureVaultMasterKey()
}

export async function listVaultEntries(): Promise<VaultEntryDto[]> {
	const masterKey = await ensureVaultUnlocked()
	const entries = await listVaultEntriesRaw()
	return await Promise.all(entries.map((entry) => resolveVaultEntry(entry, masterKey)))
}

export async function createVaultEntry(data: {
	name: string
	type: VaultEntryType
	environment?: string | null
	value: string
	folder?: string | null
	note?: string | null
	tags?: string[]
	favorite?: boolean
}): Promise<VaultEntryDto> {
	const masterKey = await ensureVaultUnlocked()
	const persisted = await createVaultEntryRaw({
		...data,
		value: await encryptVaultValue(data.value, masterKey),
	})
	return await resolveVaultEntry(persisted, masterKey)
}

export async function updateVaultEntry(id: string, patch: Partial<VaultEntryDto>): Promise<void> {
	const masterKey = await ensureVaultUnlocked()
	await updateVaultEntryRaw(id, {
		...patch,
		value: patch.value === undefined ? undefined : await encryptVaultValue(patch.value, masterKey),
		syncState: patch.syncState ?? 'local',
	})
}

export async function deleteVaultEntry(id: string): Promise<void> {
	await tauriInvoke<void>('delete_vault_entry', {
		args: { id },
	})
}

export async function exportVaultEntries(password: string) {
	const entries = await listVaultEntries()
	return await exportVaultEntriesBundle(entries, password)
}

export async function importVaultEntries(raw: string, password: string) {
	const { entries } = await importVaultEntriesBundle(raw, password)
	const masterKey = await ensureVaultUnlocked()
	const encryptedEntries = await Promise.all(
		entries.map(async (entry) => ({
			...entry,
			value: await encryptVaultValue(entry.value, masterKey),
			syncState: 'local',
		})),
	)

	await tauriInvoke<void>('import_legacy_assets', {
		args: {
			snippets: [],
			notes: [],
			diaryEntries: [],
			vaultEntries: encryptedEntries,
		},
	})

	return encryptedEntries.length
}
