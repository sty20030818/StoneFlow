import { listVaultEntries } from '@/infra/api/vault'

import { mapAssetVaultEntriesDtoToDomain, type AssetVaultEntry } from './model'

export async function listAssetVaultEntries(): Promise<AssetVaultEntry[]> {
	const entries = await listVaultEntries()
	return mapAssetVaultEntriesDtoToDomain(entries)
}
