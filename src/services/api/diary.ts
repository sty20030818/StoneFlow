export type DiaryEntryDto = {
	id: string
	date: string
	title: string
	content: string
	linked_task_ids: string[]
	linked_project_id: string | null
	created_at: number
	updated_at: number
}

const STORAGE_KEY = 'stoneflow_diary'

/**
 * 临时实现：使用 localStorage 存储日记。
 * 后续可迁移到后端 Tauri command。
 */
export async function listDiaryEntries(): Promise<DiaryEntryDto[]> {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (!raw) return []
	try {
		return JSON.parse(raw) as DiaryEntryDto[]
	} catch {
		return []
	}
}

export async function createDiaryEntry(data: {
	date: string
	title: string
	content: string
	linked_task_ids?: string[]
	linked_project_id?: string | null
}): Promise<DiaryEntryDto> {
	const now = Date.now()
	const entry: DiaryEntryDto = {
		id: `diary_${now}_${Math.random().toString(36).substring(2, 9)}`,
		date: data.date,
		title: data.title.trim(),
		content: data.content,
		linked_task_ids: data.linked_task_ids ?? [],
		linked_project_id: data.linked_project_id ?? null,
		created_at: now,
		updated_at: now,
	}

	const all = await listDiaryEntries()
	all.push(entry)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
	return entry
}

export async function updateDiaryEntry(id: string, patch: Partial<DiaryEntryDto>): Promise<void> {
	const all = await listDiaryEntries()
	const idx = all.findIndex((e) => e.id === id)
	if (idx < 0) throw new Error('Diary entry not found')
	all[idx] = { ...all[idx], ...patch, updated_at: Date.now() }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function deleteDiaryEntry(id: string): Promise<void> {
	const all = await listDiaryEntries()
	const filtered = all.filter((e) => e.id !== id)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
