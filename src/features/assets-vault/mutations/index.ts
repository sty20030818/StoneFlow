import { createVaultEntry, deleteVaultEntry, updateVaultEntry } from '@/services/api/vault'

import type { VaultEntryDto, VaultEntryType } from '../model'

type SaveVaultEntryPayload = {
	name: string
	type: VaultEntryType
	value: string
	folder?: string | null
	note?: string | null
}

export async function createAssetVaultEntry(payload: SaveVaultEntryPayload): Promise<VaultEntryDto> {
	return await createVaultEntry(payload)
}

export async function updateAssetVaultEntry(entryId: string, payload: Partial<VaultEntryDto>): Promise<void> {
	await updateVaultEntry(entryId, payload)
}

export async function deleteAssetVaultEntry(entryId: string): Promise<void> {
	await deleteVaultEntry(entryId)
}
