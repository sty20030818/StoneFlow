import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { createStaggeredEnterMotions, getAppStaggerDelay, useAppContentMotionPreset, useMotionPreset } from '@/composables/base/motion'

import { useReviewStats } from './useReviewStats'

export function useReviewStatsPageFacade() {
	const { t } = useI18n({ useScope: 'global' })
	const router = useRouter()
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const cardMotionPreset = useMotionPreset('card')
	const trendCardMotion = useAppContentMotionPreset('card', 'sectionBase', 46)
	const statusCardMotion = useAppContentMotionPreset('card', 'sectionBase', 60)
	const { loading, spaceCards, last7d, statusTotal, statusSlices } = useReviewStats()

	const spaceCardMotions = computed(() =>
		createStaggeredEnterMotions(spaceCards.value.length, cardMotionPreset.value, getAppStaggerDelay),
	)

	function goToFinishList(_spaceId: string) {
		router.push({ path: '/finish-list' })
	}

	function goToLogs(_spaceId: string) {
		router.push({ path: '/logs' })
	}

	return {
		t,
		headerMotion,
		trendCardMotion,
		statusCardMotion,
		loading,
		spaceCards,
		last7d,
		statusTotal,
		statusSlices,
		spaceCardMotions,
		goToFinishList,
		goToLogs,
	}
}
