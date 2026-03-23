import { tauriInvoke } from '@/services/tauri/invoke'

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

export async function listVaultEntries(): Promise<VaultEntryDto[]> {
	return await tauriInvoke<VaultEntryDto[]>('list_vault_entries')
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
	return await tauriInvoke<VaultEntryDto>('create_vault_entry', {
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

export async function updateVaultEntry(id: string, patch: Partial<VaultEntryDto>): Promise<void> {
	await tauriInvoke<void>('update_vault_entry', {
		args: { id, patch },
	})
}

export async function deleteVaultEntry(id: string): Promise<void> {
	await tauriInvoke<void>('delete_vault_entry', {
		args: { id },
	})
}
