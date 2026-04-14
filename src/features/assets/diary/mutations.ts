import { createDiaryEntry, deleteDiaryEntry, updateDiaryEntry } from '@/infra/api/diary'

import {
	mapAssetDiaryEntryDtoToDomain,
	mapAssetDiaryEntryPatchToDto,
	type AssetDiaryEntry,
	type AssetDiaryEntryPatch,
} from './model'

type SaveDiaryPayload = {
	date: string
	title: string
	subtitle?: string | null
	content: string
	favorite?: boolean
	tags?: string[]
	linkedTaskIds?: string[]
	linkedProjectId?: string | null
}

export async function createAssetDiaryEntry(payload: SaveDiaryPayload): Promise<AssetDiaryEntry> {
	const entry = await createDiaryEntry(payload)
	return mapAssetDiaryEntryDtoToDomain(entry)
}

export async function updateAssetDiaryEntry(entryId: string, payload: AssetDiaryEntryPatch): Promise<void> {
	await updateDiaryEntry(entryId, mapAssetDiaryEntryPatchToDto(payload))
}

export async function deleteAssetDiaryEntry(entryId: string): Promise<void> {
	await deleteDiaryEntry(entryId)
}
