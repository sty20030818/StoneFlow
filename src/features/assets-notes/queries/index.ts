import { listNotes } from '@/services/api/notes'

import type { NoteDto } from '../model'

export async function listAssetNotes(): Promise<NoteDto[]> {
	return await listNotes()
}
