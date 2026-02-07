import { useSharedStorage } from '@/composables/base/storage'

export type DiaryEntryDto = {
	id: string
	date: string
	title: string
	content: string
	linkedTaskIds: string[]
	linkedProjectId: string | null
	createdAt: number
	updatedAt: number
}

const STORAGE_KEY = 'stoneflow_diary'

function useDiaryStorage() {
	return useSharedStorage<Partial<DiaryEntryDto>[]>(STORAGE_KEY, [])
}

/**
 * 临时实现：使用 localStorage 存储日记。
 * 后续可迁移到后端 Tauri command。
 */
export async function listDiaryEntries(): Promise<DiaryEntryDto[]> {
	const parsed = useDiaryStorage().value
	return parsed.map((entry) => ({
		id: entry.id ?? '',
		date: entry.date ?? '',
		title: entry.title ?? '',
		content: entry.content ?? '',
		linkedTaskIds: entry.linkedTaskIds ?? (entry as { linked_task_ids?: string[] }).linked_task_ids ?? [],
		linkedProjectId: entry.linkedProjectId ?? (entry as { linked_project_id?: string | null }).linked_project_id ?? null,
		createdAt: entry.createdAt ?? (entry as { created_at?: number }).created_at ?? 0,
		updatedAt: entry.updatedAt ?? (entry as { updated_at?: number }).updated_at ?? 0,
	}))
}

export async function createDiaryEntry(data: {
	date: string
	title: string
	content: string
	linkedTaskIds?: string[]
	linkedProjectId?: string | null
}): Promise<DiaryEntryDto> {
	const now = Date.now()
	const entry: DiaryEntryDto = {
		id: `diary_${now}_${Math.random().toString(36).substring(2, 9)}`,
		date: data.date,
		title: data.title.trim(),
		content: data.content,
		linkedTaskIds: data.linkedTaskIds ?? [],
		linkedProjectId: data.linkedProjectId ?? null,
		createdAt: now,
		updatedAt: now,
	}

	const all = await listDiaryEntries()
	all.push(entry)
	useDiaryStorage().value = all
	return entry
}

export async function updateDiaryEntry(id: string, patch: Partial<DiaryEntryDto>): Promise<void> {
	const all = await listDiaryEntries()
	const idx = all.findIndex((e) => e.id === id)
	if (idx < 0) throw new Error('Diary entry not found')
	all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
	useDiaryStorage().value = all
}

export async function deleteDiaryEntry(id: string): Promise<void> {
	const all = await listDiaryEntries()
	const filtered = all.filter((e) => e.id !== id)
	useDiaryStorage().value = filtered
}
