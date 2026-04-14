import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import {
	DEFAULT_STAGGER_MOTION_LIMIT,
	createStaggeredEnterMotions,
	getAppStaggerDelay,
	useAppContentMotionPreset,
	useMotionPreset,
} from '@/shared/composables/base/motion'

import type { InspectorActivityLog } from '../model'
import { useReviewLogs } from './useReviewLogs'

export function useReviewLogsPageFacade() {
	const { t } = useI18n({ useScope: 'global' })
	const router = useRouter()
	const headerMotion = useAppContentMotionPreset('drawerSection', 'sectionBase')
	const filtersMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 18)
	const contentMotion = useAppContentMotionPreset('drawerSection', 'sectionBase', 34)
	const rawItemPreset = useMotionPreset('listItem')
	const aggregateTodayMotion = useAppContentMotionPreset('card', 'sectionBase', 52)
	const aggregateWeekMotion = useAppContentMotionPreset('card', 'sectionBase', 70)
	const {
		loading,
		loadingMore,
		hasMore,
		logs,
		viewMode,
		entityType,
		spaceFilter,
		dateRange,
		entityTypeOptions,
		spaceOptions,
		dateRangeOptions,
		todayGroups,
		last7dGroups,
		formatDateTime,
		formatVariableInfo,
		formatChangeSummary,
		loadMore,
		exportLogs,
	} = useReviewLogs()

	const rawItemMotions = computed(() =>
		createStaggeredEnterMotions(logs.value.length, rawItemPreset.value, getAppStaggerDelay, {
			limit: DEFAULT_STAGGER_MOTION_LIMIT,
		}),
	)

	function goToFinishList(_item: InspectorActivityLog) {
		router.push({ path: '/finish-list' })
	}

	function goToStats(_item: InspectorActivityLog) {
		router.push({ path: '/stats' })
	}

	return {
		t,
		headerMotion,
		filtersMotion,
		contentMotion,
		loading,
		loadingMore,
		hasMore,
		logs,
		viewMode,
		entityType,
		spaceFilter,
		dateRange,
		entityTypeOptions,
		spaceOptions,
		dateRangeOptions,
		todayGroups,
		last7dGroups,
		rawItemMotions,
		aggregateTodayMotion,
		aggregateWeekMotion,
		formatDateTime,
		formatVariableInfo,
		formatChangeSummary,
		loadMore,
		onExport: exportLogs,
		goToFinishList,
		goToStats,
	}
}
