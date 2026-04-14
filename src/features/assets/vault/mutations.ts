import { createVaultEntry, deleteVaultEntry, updateVaultEntry } from '@/infra/api/vault'

import {
	mapAssetVaultEntryDtoToDomain,
	mapAssetVaultEntryPatchToDto,
	type AssetVaultEntry,
	type AssetVaultEntryPatch,
	type AssetVaultEntryType,
} from './model'

type SaveVaultEntryPayload = {
	name: string
	type: AssetVaultEntryType
	value: string
	folder?: string | null
	note?: string | null
}

export async function createAssetVaultEntry(payload: SaveVaultEntryPayload): Promise<AssetVaultEntry> {
	const entry = await createVaultEntry(payload)
	return mapAssetVaultEntryDtoToDomain(entry)
}

export async function updateAssetVaultEntry(entryId: string, payload: AssetVaultEntryPatch): Promise<void> {
	await updateVaultEntry(entryId, mapAssetVaultEntryPatchToDto(payload))
}

export async function deleteAssetVaultEntry(entryId: string): Promise<void> {
	await deleteVaultEntry(entryId)
}
