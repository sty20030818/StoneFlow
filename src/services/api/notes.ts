export type NoteDto = {
	id: string
	title: string
	content: string
	linked_project_id: string | null
	linked_task_id: string | null
	created_at: number
	updated_at: number
}

const STORAGE_KEY = 'stoneflow_notes'

/**
 * 临时实现：使用 localStorage 存储笔记。
 * 后续可迁移到后端 Tauri command。
 */
export async function listNotes(): Promise<NoteDto[]> {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (!raw) return []
	try {
		return JSON.parse(raw) as NoteDto[]
	} catch {
		return []
	}
}

export async function createNote(data: {
	title: string
	content: string
	linked_project_id?: string | null
	linked_task_id?: string | null
}): Promise<NoteDto> {
	const now = Date.now()
	const note: NoteDto = {
		id: `note_${now}_${Math.random().toString(36).substring(2, 9)}`,
		title: data.title.trim(),
		content: data.content,
		linked_project_id: data.linked_project_id ?? null,
		linked_task_id: data.linked_task_id ?? null,
		created_at: now,
		updated_at: now,
	}

	const all = await listNotes()
	all.push(note)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
	return note
}

export async function updateNote(id: string, patch: Partial<NoteDto>): Promise<void> {
	const all = await listNotes()
	const idx = all.findIndex((n) => n.id === id)
	if (idx < 0) throw new Error('Note not found')
	all[idx] = { ...all[idx], ...patch, updated_at: Date.now() }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function deleteNote(id: string): Promise<void> {
	const all = await listNotes()
	const filtered = all.filter((n) => n.id !== id)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
