import { listVaultEntries } from '@/services/api/vault'

import type { VaultEntryDto } from '../model'

export async function listAssetVaultEntries(): Promise<VaultEntryDto[]> {
	return await listVaultEntries()
}
