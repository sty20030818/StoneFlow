import { createNote, deleteNote, updateNote } from '@/services/api/notes'

import {
	mapAssetNoteDtoToDomain,
	mapAssetNotePatchToDto,
	type AssetNote,
	type AssetNotePatch,
} from '../model'

type SaveNotePayload = {
	title: string
	content: string
	linkedProjectId?: string | null
	linkedTaskId?: string | null
}

export async function createAssetNote(payload: SaveNotePayload): Promise<AssetNote> {
	const note = await createNote(payload)
	return mapAssetNoteDtoToDomain(note)
}

export async function updateAssetNote(noteId: string, payload: AssetNotePatch): Promise<void> {
	await updateNote(noteId, mapAssetNotePatchToDto(payload))
}

export async function deleteAssetNote(noteId: string): Promise<void> {
	await deleteNote(noteId)
}
