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

/**
 * 临时实现：使用 localStorage 存储笔记。
 * 后续可迁移到后端 Tauri command。
 */
export async function listNotes(): Promise<NoteDto[]> {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw) as Partial<NoteDto>[]
		return parsed.map((note) => ({
			id: note.id ?? '',
			title: note.title ?? '',
			content: note.content ?? '',
			linkedProjectId:
				note.linkedProjectId ?? (note as { linked_project_id?: string | null }).linked_project_id ?? null,
			linkedTaskId: note.linkedTaskId ?? (note as { linked_task_id?: string | null }).linked_task_id ?? null,
			createdAt: note.createdAt ?? (note as { created_at?: number }).created_at ?? 0,
			updatedAt: note.updatedAt ?? (note as { updated_at?: number }).updated_at ?? 0,
		}))
	} catch {
		return []
	}
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
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
	return note
}

export async function updateNote(id: string, patch: Partial<NoteDto>): Promise<void> {
	const all = await listNotes()
	const idx = all.findIndex((n) => n.id === id)
	if (idx < 0) throw new Error('Note not found')
	all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function deleteNote(id: string): Promise<void> {
	const all = await listNotes()
	const filtered = all.filter((n) => n.id !== id)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
