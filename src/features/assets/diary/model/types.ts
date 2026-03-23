import type { DiaryEntryDto } from '@/services/api/diary'
import type { TaskDto } from '@/services/api/tasks'

export type AssetDiaryEntry = {
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

export type AssetDiaryTask = {
	id: string
	spaceId: string
	projectId: string | null
	title: string
	note: string | null
	status: string
	doneReason: string | null
	priority: string
	tags: string[]
	rank: number
	createdAt: number
	updatedAt: number
	completedAt: number | null
	deadlineAt: number | null
	archivedAt: number | null
	deletedAt: number | null
	links: TaskDto['links']
	customFields: TaskDto['customFields']
	createBy: string
}

export type AssetDiaryEntryPatch = Partial<AssetDiaryEntry>

export function mapAssetDiaryEntryDtoToDomain(entry: DiaryEntryDto): AssetDiaryEntry {
	return {
		...entry,
		linkedTaskIds: [...entry.linkedTaskIds],
	}
}

export function mapAssetDiaryEntriesDtoToDomain(entries: DiaryEntryDto[]): AssetDiaryEntry[] {
	return entries.map(mapAssetDiaryEntryDtoToDomain)
}

export function mapAssetDiaryTaskDtoToDomain(task: TaskDto): AssetDiaryTask {
	return {
		...task,
		tags: [...task.tags],
		links: task.links.map((link) => ({ ...link })),
		customFields: task.customFields
			? {
					fields: task.customFields.fields.map((field) => ({ ...field })),
				}
			: null,
	}
}

export function mapAssetDiaryTasksDtoToDomain(tasks: TaskDto[]): AssetDiaryTask[] {
	return tasks.map(mapAssetDiaryTaskDtoToDomain)
}

export function mapAssetDiaryEntryPatchToDto(patch: AssetDiaryEntryPatch): Partial<DiaryEntryDto> {
	return {
		...patch,
		linkedTaskIds: patch.linkedTaskIds ? [...patch.linkedTaskIds] : patch.linkedTaskIds,
	}
}

export type DiaryGroupedEntry = {
	date: string
	dateLabel: string
	entries: AssetDiaryEntry[]
	tasks: AssetDiaryTask[]
}
