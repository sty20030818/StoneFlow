import { useSharedStorage } from '@/composables/base/storage'

export type NoteDto = {
	id: string
	title: string
	content: string
	linkedProjectId: string | null
	linkedTaskId: string | null
	createdAt: number
	updatedAt: number
}

const STORAGE_KEY = 'stoneflow_notes'

function useNotesStorage() {
	return useSharedStorage<Partial<NoteDto>[]>(STORAGE_KEY, [])
}

/**
 * 临时实现：使用 localStorage 存储笔记。
 * 后续可迁移到后端 Tauri command。
 */
export async function listNotes(): Promise<NoteDto[]> {
	const parsed = useNotesStorage().value
	return parsed.map((note) => ({
		id: note.id ?? '',
		title: note.title ?? '',
		content: note.content ?? '',
		linkedProjectId: note.linkedProjectId ?? (note as { linked_project_id?: string | null }).linked_project_id ?? null,
		linkedTaskId: note.linkedTaskId ?? (note as { linked_task_id?: string | null }).linked_task_id ?? null,
		createdAt: note.createdAt ?? (note as { created_at?: number }).created_at ?? 0,
		updatedAt: note.updatedAt ?? (note as { updated_at?: number }).updated_at ?? 0,
	}))
}

export async function createNote(data: {
	title: string
	content: string
	linkedProjectId?: string | null
	linkedTaskId?: string | null
}): Promise<NoteDto> {
	const now = Date.now()
	const note: NoteDto = {
		id: `note_${now}_${Math.random().toString(36).substring(2, 9)}`,
		title: data.title.trim(),
		content: data.content,
		linkedProjectId: data.linkedProjectId ?? null,
		linkedTaskId: data.linkedTaskId ?? null,
		createdAt: now,
		updatedAt: now,
	}

	const all = await listNotes()
	all.push(note)
	useNotesStorage().value = all
	return note
}

export async function updateNote(id: string, patch: Partial<NoteDto>): Promise<void> {
	const all = await listNotes()
	const idx = all.findIndex((n) => n.id === id)
	if (idx < 0) throw new Error('Note not found')
	all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
	useNotesStorage().value = all
}

export async function deleteNote(id: string): Promise<void> {
	const all = await listNotes()
	const filtered = all.filter((n) => n.id !== id)
	useNotesStorage().value = filtered
}
