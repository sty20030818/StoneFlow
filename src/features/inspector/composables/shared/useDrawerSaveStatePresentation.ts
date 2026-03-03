import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

export type DrawerSaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useDrawerSaveStatePresentation(saveState: Ref<DrawerSaveState>) {
	const { t } = useI18n({ useScope: 'global' })
	const saveStateVisible = computed(() => saveState.value !== 'idle')

	const saveStateLabel = computed(() => {
		if (saveState.value === 'saving') return t('inspector.saveState.saving')
		if (saveState.value === 'saved') return t('inspector.saveState.saved')
		if (saveState.value === 'error') return t('inspector.saveState.error')
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
