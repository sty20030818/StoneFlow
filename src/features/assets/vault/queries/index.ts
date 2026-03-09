import { listVaultEntries } from '@/services/api/vault'

import { mapAssetVaultEntriesDtoToDomain, type AssetVaultEntry } from '../model'

export async function listAssetVaultEntries(): Promise<AssetVaultEntry[]> {
	const entries = await listVaultEntries()
	return mapAssetVaultEntriesDtoToDomain(entries)
}
