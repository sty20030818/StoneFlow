import { createNote, deleteNote, updateNote } from '@/services/api/notes'

import type { NoteDto } from '../model'

type SaveNotePayload = {
	title: string
	content: string
	linkedProjectId?: string | null
	linkedTaskId?: string | null
}

export async function createAssetNote(payload: SaveNotePayload): Promise<NoteDto> {
	return await createNote(payload)
}

export async function updateAssetNote(noteId: string, payload: Partial<NoteDto>): Promise<void> {
	await updateNote(noteId, payload)
}

export async function deleteAssetNote(noteId: string): Promise<void> {
	await deleteNote(noteId)
}
