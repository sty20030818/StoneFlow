import { computed, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useI18n } from 'vue-i18n'

import { resolveErrorMessage } from '@/utils/error-message'

type UseLoadErrorFeedbackOptions = {
	error: MaybeRefOrGetter<unknown | null | undefined>
	hasData: MaybeRefOrGetter<boolean>
	loading?: MaybeRefOrGetter<boolean>
	toastTitle: MaybeRefOrGetter<string>
	fallbackKey?: string
}

export function useLoadErrorFeedback(options: UseLoadErrorFeedbackOptions) {
	const toast = useToast()
	const { t } = useI18n({ useScope: 'global' })

	const loadError = computed(() => toValue(options.error) ?? null)
	const hasData = computed(() => toValue(options.hasData))
	const loading = computed(() => toValue(options.loading) ?? false)
	const toastTitle = computed(() => toValue(options.toastTitle))
	const loadErrorMessage = computed(() => {
		if (!loadError.value) return ''
		return resolveErrorMessage(loadError.value, t, {
			fallbackKey: options.fallbackKey,
		})
	})
	const showLoadErrorState = computed(() => Boolean(loadError.value) && !loading.value && !hasData.value)

	watch(
		loadError,
		(nextError, prevError) => {
			if (!nextError || nextError === prevError || showLoadErrorState.value) return
			toast.add({
				title: toastTitle.value,
				description: loadErrorMessage.value || undefined,
				color: 'error',
			})
		},
		{ immediate: true },
	)

	return {
		loadError,
		loadErrorMessage,
		showLoadErrorState,
	}
}
