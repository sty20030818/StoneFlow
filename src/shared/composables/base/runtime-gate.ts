import { createGlobalState, useDocumentVisibility, useNetwork } from '@vueuse/core'
import { computed } from 'vue'

export const useRuntimeGate = createGlobalState(() => {
	const visibility = useDocumentVisibility()
	const { isOnline } = useNetwork()

	const isVisible = computed(() => visibility.value === 'visible')
	const canBackgroundRefresh = computed(() => isVisible.value && isOnline.value)

	return {
		isVisible,
		isOnline,
		canBackgroundRefresh,
	}
})
