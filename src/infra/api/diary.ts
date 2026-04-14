import { tauriInvoke } from '@/infra/tauri/invoke'

export type DiaryEntryDto = {
	id: string
	date: string
	title: string
	subtitle: string | null
	content: string
	tags: string[]
	favorite: boolean
	linkedTaskIds: string[]
	linkedProjectId: string | null
	syncState: string
	createdAt: number
	updatedAt: number
}

export async function listDiaryEntries(): Promise<DiaryEntryDto[]> {
	return await tauriInvoke<DiaryEntryDto[]>('list_diary_entries')
}

export async function createDiaryEntry(data: {
	date: string
	title: string
	subtitle?: string | null
	content: string
	tags?: string[]
	favorite?: boolean
	linkedTaskIds?: string[]
	linkedProjectId?: string | null
}): Promise<DiaryEntryDto> {
	return await tauriInvoke<DiaryEntryDto>('create_diary_entry', {
		args: {
			date: data.date,
			title: data.title,
			subtitle: data.subtitle ?? null,
			content: data.content,
			tags: data.tags ?? [],
			favorite: data.favorite ?? false,
			linkedTaskIds: data.linkedTaskIds ?? [],
			linkedProjectId: data.linkedProjectId ?? null,
		},
	})
}

export async function updateDiaryEntry(id: string, patch: Partial<DiaryEntryDto>): Promise<void> {
	await tauriInvoke<void>('update_diary_entry', {
		args: { id, patch },
	})
}

export async function deleteDiaryEntry(id: string): Promise<void> {
	await tauriInvoke<void>('delete_diary_entry', {
		args: { id },
	})
}
