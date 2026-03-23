import { tauriInvoke } from '@/services/tauri/invoke'

export type NoteDto = {
	id: string
	title: string
	content: string
	excerpt: string | null
	tags: string[]
	favorite: boolean
	linkedProjectId: string | null
	linkedTaskId: string | null
	syncState: string
	createdAt: number
	updatedAt: number
}

export async function listNotes(): Promise<NoteDto[]> {
	return await tauriInvoke<NoteDto[]>('list_notes')
}

export async function createNote(data: {
	title: string
	content: string
	excerpt?: string | null
	tags?: string[]
	favorite?: boolean
	linkedProjectId?: string | null
	linkedTaskId?: string | null
}): Promise<NoteDto> {
	return await tauriInvoke<NoteDto>('create_note', {
		args: {
			title: data.title,
			content: data.content,
			excerpt: data.excerpt ?? null,
			tags: data.tags ?? [],
			favorite: data.favorite ?? false,
			linkedProjectId: data.linkedProjectId ?? null,
			linkedTaskId: data.linkedTaskId ?? null,
		},
	})
}

export async function updateNote(id: string, patch: Partial<NoteDto>): Promise<void> {
	await tauriInvoke<void>('update_note', {
		args: { id, patch },
	})
}

export async function deleteNote(id: string): Promise<void> {
	await tauriInvoke<void>('delete_note', {
		args: { id },
	})
}
