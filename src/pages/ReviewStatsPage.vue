<template>
	<section class="space-y-4">
		<!-- 顶部标题 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-1">
			<div class="flex items-center gap-2 text-sm font-semibold">
				<UIcon
					name="i-lucide-bar-chart-3"
					class="text-blue-500" />
				<span>{{ t('review.stats.title') }}</span>
			</div>
			<div class="text-xs text-muted">{{ t('review.stats.subtitle') }}</div>
		</header>

		<!-- 关键指标卡片：每个 Space 的「本周完成数 / 活跃 Project 数」 -->
		<section class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<UCard
				v-for="(s, index) in spaceCards"
				:key="s.id"
				v-motion="spaceCardMotions[index]"
				class="cursor-pointer hover:bg-default transition-colors duration-150"
				@click="goToFinishList(s.id)">
				<template #header>
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-2">
							<UIcon
								:name="s.icon"
								:class="s.iconClass" />
							<div class="text-sm font-semibold">{{ s.label }}</div>
						</div>
						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-arrow-right"
							@click.stop="goToLogs(s.id)">
							<span class="ml-1 text-[11px]">{{ t('review.stats.logsAction') }}</span>
						</UButton>
					</div>
				</template>

				<div class="flex items-end justify-between gap-2">
					<div>
						<div class="text-xs text-muted mb-0.5">{{ t('review.stats.thisWeekDone') }}</div>
						<div class="text-2xl font-bold">{{ s.thisWeekDone }}</div>
					</div>
					<div class="text-right">
						<div class="text-xs text-muted mb-0.5">{{ t('review.stats.activeProjects') }}</div>
						<div class="text-lg font-semibold">{{ s.activeProjects }}</div>
					</div>
				</div>
			</UCard>
		</section>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
			<!-- 最近 7 天完成数折线图（简化为条形趋势） -->
			<UCard
				v-motion="trendCardMotion"
				class="lg:col-span-2">
				<template #header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-line-chart"
								class="size-4 text-emerald-500" />
							<div class="text-sm font-semibold">{{ t('review.stats.trendTitle') }}</div>
						</div>
					</div>
				</template>

				<div class="space-y-1">
					<div
						v-for="d in last7d"
						:key="d.date"
						class="flex items-center gap-2 text-xs">
						<div class="w-16 text-muted">{{ d.date }}</div>
						<div class="flex-1 h-3 rounded-full bg-default/60 overflow-hidden">
							<div
								class="h-full rounded-full bg-emerald-500/80"
								:style="{ width: `${d.percent}%` }" />
						</div>
						<div class="w-8 text-right text-muted">{{ d.count }}</div>
					</div>
				</div>
			</UCard>

			<!-- 状态分布 -->
			<UCard v-motion="statusCardMotion">
				<template #header>
					<div class="flex items-center gap-2">
						<UIcon
							name="i-lucide-pie-chart"
							class="size-4 text-purple-500" />
						<div class="text-sm font-semibold">{{ t('review.stats.statusDistributionTitle') }}</div>
					</div>
				</template>

				<div class="space-y-3">
					<div class="relative w-28 h-28 mx-auto">
						<svg
							viewBox="0 0 36 36"
							class="w-full h-full -rotate-90 text-muted/20">
							<circle
								cx="18"
								cy="18"
								r="15.9155"
								fill="none"
								stroke="currentColor"
								stroke-width="3" />
							<circle
								v-for="slice in statusSlices"
								:key="slice.key"
								cx="18"
								cy="18"
								r="15.9155"
								fill="none"
								:stroke="slice.color"
								stroke-width="3"
								stroke-linecap="round"
								:stroke-dasharray="`${slice.percent} ${100 - slice.percent}`"
								:stroke-dashoffset="slice.offset" />
						</svg>
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="text-xs text-muted text-center">
								<div class="text-[11px]">{{ t('review.stats.totalTasks') }}</div>
								<div class="text-base font-semibold">{{ statusTotal }}</div>
							</div>
						</div>
					</div>

					<div class="space-y-1">
						<div
							v-for="s in statusSlices"
							:key="s.key"
							class="flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<span
									class="inline-flex w-2.5 h-2.5 rounded-full"
									:style="{ backgroundColor: s.color }" />
								<span>{{ s.label }}</span>
							</div>
							<div class="text-muted">{{ s.count }} · {{ s.percent }}%</div>
						</div>
					</div>
					<div
						v-if="loading"
						class="text-xs text-muted">
						{{ t('review.stats.loading') }}...
					</div>
				</div>
			</UCard>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useReviewStatsPageFacade } from '@/features/review'

	const {
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
	} = useReviewStatsPageFacade()
</script>
