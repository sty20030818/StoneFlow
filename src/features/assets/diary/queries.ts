import { listDiaryEntries } from '@/services/api/diary'
import { listTasks } from '@/services/api/tasks'

import {
	mapAssetDiaryEntriesDtoToDomain,
	mapAssetDiaryTasksDtoToDomain,
	type AssetDiaryEntry,
	type AssetDiaryTask,
} from './model'

export async function listAssetDiaryEntries(): Promise<AssetDiaryEntry[]> {
	const entries = await listDiaryEntries()
	return mapAssetDiaryEntriesDtoToDomain(entries)
}

export async function listAssetDiaryDoneTasks(): Promise<AssetDiaryTask[]> {
	const tasks = await listTasks({ status: 'done' })
	return mapAssetDiaryTasksDtoToDomain(tasks)
}
