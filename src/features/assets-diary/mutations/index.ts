import { createDiaryEntry, deleteDiaryEntry, updateDiaryEntry } from '@/services/api/diary'

import type { DiaryEntryDto } from '../model'

type SaveDiaryPayload = {
	date: string
	title: string
	content: string
	linkedTaskIds?: string[]
	linkedProjectId?: string | null
}

export async function createAssetDiaryEntry(payload: SaveDiaryPayload): Promise<DiaryEntryDto> {
	return await createDiaryEntry(payload)
}

export async function updateAssetDiaryEntry(entryId: string, payload: Partial<DiaryEntryDto>): Promise<void> {
	await updateDiaryEntry(entryId, payload)
}

export async function deleteAssetDiaryEntry(entryId: string): Promise<void> {
	await deleteDiaryEntry(entryId)
}
