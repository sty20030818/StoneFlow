<template>
	<section class="space-y-4">
		<!-- 顶部：标题 + 视图切换 + 导出 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-scroll-text"
						class="text-orange-500" />
					<span>{{ t('review.logs.title') }}</span>
				</div>
				<div class="text-xs text-muted">{{ t('review.logs.subtitle') }}</div>
			</div>

			<div class="flex flex-wrap items-center gap-2 justify-end">
				<div class="inline-flex items-center gap-1.5 rounded-full bg-elevated/70 px-1 py-1 border border-default/70">
					<button
						type="button"
						class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors"
						:class="
							viewMode === 'raw'
								? 'bg-default text-default shadow-sm'
								: 'text-muted hover:text-default hover:bg-default/40'
						"
						@click="viewMode = 'raw'">
						<UIcon
							name="i-lucide-list-tree"
							class="size-3.5" />
						<span>{{ t('review.logs.view.raw') }}</span>
					</button>
					<button
						type="button"
						class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors"
						:class="
							viewMode === 'aggregate'
								? 'bg-default text-default shadow-sm'
								: 'text-muted hover:text-default hover:bg-default/40'
						"
						@click="viewMode = 'aggregate'">
						<UIcon
							name="i-lucide-layout-dashboard"
							class="size-3.5" />
						<span>{{ t('review.logs.view.aggregate') }}</span>
					</button>
				</div>

				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-download"
					@click="onExport">
					<span class="ml-1 text-[11px]">{{ t('common.actions.export') }}</span>
				</UButton>

				<div
					v-if="loading"
					class="text-[11px] text-muted">
					{{ t('common.status.loading') }}...
				</div>
			</div>
		</header>

		<!-- 筛选条 -->
		<section
			v-motion="filtersMotion"
			class="rounded-xl border border-default bg-elevated/60 px-3 py-2.5 flex flex-wrap items-center gap-2">
			<div class="flex items-center gap-1.5 text-[11px] text-muted">
				<UIcon
					name="i-lucide-filter"
					class="size-3.5" />
				<span>{{ t('common.labels.filters') }}</span>
			</div>

			<USelectMenu
				v-model="entityType"
				:options="entityTypeOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<USelectMenu
				v-model="spaceFilter"
				:options="spaceOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<USelectMenu
				v-model="dateRange"
				:options="dateRangeOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />
		</section>

		<!-- 内容：原始视图 / 聚合视图 -->
		<section
			v-if="viewMode === 'raw'"
			v-motion="contentMotion">
			<div
				v-if="logs.length === 0 && !loading"
				class="text-sm text-muted">
				{{ t('review.logs.empty') }}
			</div>

			<div
				v-else
				class="space-y-1.5">
				<div
					v-for="(item, index) in logs"
					:key="item.id"
					v-motion="rawItemMotions[index]"
					class="px-3 py-2 rounded-lg border border-default bg-elevated/80 flex items-center justify-between gap-3 text-sm">
					<div class="min-w-0">
						<div class="flex items-center gap-2">
							<UBadge
								color="neutral"
								variant="soft"
								size="2xs">
								{{ item.entityType }}
							</UBadge>
							<UBadge
								color="primary"
								variant="soft"
								size="2xs">
								{{ item.actionLabel }}
							</UBadge>
							<span class="text-[11px] text-muted">{{ formatDateTime(item.createdAt) }}</span>
						</div>
						<div class="text-sm">
							{{ item.detail }}
						</div>
						<div class="text-[11px] text-muted">
							{{ formatVariableInfo(item) }}
						</div>
						<div
							v-if="formatChangeSummary(item)"
							class="text-[11px] text-muted">
							{{ formatChangeSummary(item) }}
						</div>
						<div class="text-[11px] text-muted">
							{{ item.projectName }} · {{ t('review.logs.spaceLabel', { id: item.spaceId }) }}
						</div>
					</div>

					<div class="flex items-center gap-1.5 shrink-0">
						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-list-checks"
							@click="goToFinishList(item)">
							<span class="ml-1 text-[11px]">{{ t('review.logs.finishListAction') }}</span>
						</UButton>

						<UButton
							color="neutral"
							variant="ghost"
							size="2xs"
							icon="i-lucide-bar-chart-3"
							@click="goToStats(item)">
							<span class="ml-1 text-[11px]">{{ t('review.logs.statsAction') }}</span>
						</UButton>
					</div>
				</div>

				<div
					v-if="hasMore"
					class="pt-2 flex items-center justify-center">
					<UButton
						color="neutral"
						variant="soft"
						size="xs"
						:loading="loadingMore"
						@click="loadMore">
						{{ t('review.logs.loadMore') }}
					</UButton>
				</div>
			</div>
		</section>

		<section
			v-else
			v-motion="contentMotion"
			class="space-y-4">
			<!-- 今天对哪些 Project 做了什么 -->
			<UCard v-motion="aggregateTodayMotion">
				<template #header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-sun"
								class="size-4 text-amber-500" />
							<div class="text-sm font-semibold">{{ t('review.logs.aggregate.todayTitle') }}</div>
						</div>
						<div class="text-[11px] text-muted">
							{{ t('review.logs.aggregate.totalProjects', { count: todayGroups.length }) }}
						</div>
					</div>
				</template>

				<div
					v-if="todayGroups.length === 0"
					class="text-sm text-muted">
					{{ t('review.logs.aggregate.todayEmpty') }}
				</div>
				<div
					v-else
					class="space-y-2">
					<div
						v-for="g in todayGroups"
						:key="g.key"
						class="px-2 py-1.5 rounded-lg border border-default/70 bg-elevated/80 flex items-center justify-between gap-3 text-sm">
						<div class="min-w-0">
							<div class="font-medium truncate">{{ g.projectName }}</div>
							<div class="text-[11px] text-muted">
								{{ t('review.logs.spaceLabel', { id: g.spaceId }) }} · {{ g.actions.join('、') }}
							</div>
						</div>
						<UBadge
							color="primary"
							variant="soft"
							size="xs">
							{{ t('review.logs.aggregate.records', { count: g.count }) }}
						</UBadge>
					</div>
				</div>
			</UCard>

			<!-- 最近 7 天 Project 变更统计 -->
			<UCard v-motion="aggregateWeekMotion">
				<template #header>
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-calendar-range"
								class="size-4 text-sky-500" />
							<div class="text-sm font-semibold">{{ t('review.logs.aggregate.last7dTitle') }}</div>
						</div>
						<div class="text-[11px] text-muted">
							{{ t('review.logs.aggregate.totalProjects', { count: last7dGroups.length }) }}
						</div>
					</div>
				</template>

				<div
					v-if="last7dGroups.length === 0"
					class="text-sm text-muted">
					{{ t('review.logs.aggregate.last7dEmpty') }}
				</div>
				<div
					v-else
					class="space-y-2">
					<div
						v-for="g in last7dGroups"
						:key="g.key"
						class="px-2 py-1.5 rounded-lg border border-default/70 bg-elevated/80 flex items-center justify-between gap-3 text-sm">
						<div class="min-w-0">
							<div class="font-medium truncate">{{ g.projectName }}</div>
							<div class="text-[11px] text-muted">
								{{
									t('review.logs.aggregate.changeSummary', {
										spaceId: g.spaceId,
										count: g.count,
										completed: g.completedCount,
									})
								}}
							</div>
						</div>
						<UBadge
							color="success"
							variant="soft"
							size="xs">
							{{ t('review.logs.aggregate.completionRate', { percent: g.completedRatio }) }}
						</UBadge>
					</div>
				</div>
			</UCard>
		</section>
	</section>
</template>

<script setup lang="ts">
	import { useRouteMetaAppHeader } from '@/app/layout/header'
	import { useReviewLogsPageFacade } from '@/features/review'

	useRouteMetaAppHeader('review-logs-page')

	const {
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
		onExport,
		goToFinishList,
		goToStats,
	} = useReviewLogsPageFacade()
</script>
