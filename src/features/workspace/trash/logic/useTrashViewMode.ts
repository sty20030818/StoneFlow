import { ref } from 'vue'

type TrashViewMode = 'projects' | 'tasks'

const trashViewMode = ref<TrashViewMode>('projects')

export function useTrashViewMode() {
	return trashViewMode
}
