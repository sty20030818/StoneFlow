import { computed, type Ref } from 'vue'

export type DrawerSaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useDrawerSaveStatePresentation(saveState: Ref<DrawerSaveState>) {
	const saveStateVisible = computed(() => saveState.value !== 'idle')

	const saveStateLabel = computed(() => {
		if (saveState.value === 'saving') return '保存中'
		if (saveState.value === 'saved') return '已保存'
		if (saveState.value === 'error') return '保存失败'
		return ''
	})

	const saveStateClass = computed(() => {
		if (saveState.value === 'saving') return 'text-blue-500'
		if (saveState.value === 'saved') return 'text-emerald-500'
		if (saveState.value === 'error') return 'text-rose-500'
		return 'text-muted'
	})

	const saveStateDotClass = computed(() => {
		if (saveState.value === 'saving') return 'bg-blue-500'
		if (saveState.value === 'saved') return 'bg-emerald-500'
		if (saveState.value === 'error') return 'bg-rose-500'
		return 'bg-muted'
	})

	return {
		saveStateVisible,
		saveStateLabel,
		saveStateClass,
		saveStateDotClass,
	}
}
