import type { VaultEntryDto, VaultEntryType } from '@/services/api/vault'

export type AssetVaultEntryType = VaultEntryType

export type AssetVaultEntry = {
	id: string
	name: string
	type: AssetVaultEntryType
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

export type AssetVaultEntryPatch = Partial<AssetVaultEntry>

export function mapAssetVaultEntryDtoToDomain(entry: VaultEntryDto): AssetVaultEntry {
	return {
		...entry,
	}
}

export function mapAssetVaultEntriesDtoToDomain(entries: VaultEntryDto[]): AssetVaultEntry[] {
	return entries.map(mapAssetVaultEntryDtoToDomain)
}

export function mapAssetVaultEntryPatchToDto(patch: AssetVaultEntryPatch): Partial<VaultEntryDto> {
	return {
		...patch,
	}
}
