import { useStorage } from '@vueuse/core'

type TrashViewMode = 'projects' | 'tasks'

export function useTrashViewMode() {
	return useStorage<TrashViewMode>('trash_view_mode_v1', 'projects')
}
