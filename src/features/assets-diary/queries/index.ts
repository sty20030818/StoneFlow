import { listDiaryEntries } from '@/services/api/diary'
import { listTasks } from '@/services/api/tasks'

import type { DiaryEntryDto, TaskDto } from '../model'

export async function listAssetDiaryEntries(): Promise<DiaryEntryDto[]> {
	return await listDiaryEntries()
}

export async function listAssetDiaryDoneTasks(): Promise<TaskDto[]> {
	return await listTasks({ status: 'done' })
}
