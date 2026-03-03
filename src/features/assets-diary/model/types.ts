import type { DiaryEntryDto } from '@/services/api/diary'
import type { TaskDto } from '@/services/api/tasks'

export type { DiaryEntryDto, TaskDto }

export type DiaryGroupedEntry = {
	date: string
	dateLabel: string
	entries: DiaryEntryDto[]
	tasks: TaskDto[]
}
