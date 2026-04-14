import { listNotes } from '@/infra/api/notes'

import { mapAssetNotesDtoToDomain, type AssetNote } from './model'

export async function listAssetNotes(): Promise<AssetNote[]> {
	const notes = await listNotes()
	return mapAssetNotesDtoToDomain(notes)
}
