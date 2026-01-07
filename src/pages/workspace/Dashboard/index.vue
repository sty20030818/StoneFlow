<template>
	<section class="space-y-6">
		<PageHeader
			title="📊 Dashboard"
			description="任务概览与统计" />

		<StatsCards
			:stats="stats"
			:loading="loading" />

		<SpaceOverview
			:space-stats="spaceStats"
			:loading="loading" />

		<RecentDone
			:tasks="recentDone"
			:loading="loading"
			:space-label="spaceLabel"
			:time-ago="timeAgo" />
	</section>
</template>

<script setup lang="ts">
	import { useDashboard } from './composables/useDashboard'
	import StatsCards from './components/StatsCards.vue'
	import SpaceOverview from './components/SpaceOverview.vue'
	import RecentDone from './components/RecentDone.vue'

	const { loading, stats, spaceStats, recentDone, spaceLabel, timeAgo } = useDashboard()
</script>
