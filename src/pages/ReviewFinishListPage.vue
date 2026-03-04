<template>
	<section class="space-y-4">
		<!-- 顶部：标题 + 统计 -->
		<header
			v-motion="headerMotion"
			class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-1">
				<div class="flex items-center gap-2 text-sm font-semibold">
					<UIcon
						name="i-lucide-check-circle-2"
						class="text-green-500" />
					<span>{{ t('review.finishList.title') }}</span>
				</div>
				<div class="text-xs text-muted">{{ t('review.finishList.subtitle') }}</div>
			</div>

			<div class="flex flex-wrap items-center gap-2 justify-end">
				<UBadge
					color="success"
					variant="soft"
					size="xs">
					{{ t('review.finishList.badges.thisWeek', { count: stats.thisWeekCount }) }}
				</UBadge>
				<UBadge
					color="primary"
					variant="soft"
					size="xs">
					{{ t('review.finishList.badges.activeProjects', { count: stats.activeProjectCount }) }}
				</UBadge>
				<UBadge
					color="neutral"
					variant="soft"
					size="xs">
					{{ t('review.finishList.badges.spaces', { count: stats.spaceCount }) }}
				</UBadge>
				<div
					v-if="loading"
					class="text-[11px] text-muted">
					{{ t('common.status.loading') }}...
				</div>
			</div>
		</header>

		<!-- 筛选条：时间 / Space / Project / Tag -->
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
				v-model="spaceFilter"
				:options="spaceOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<USelectMenu
				v-model="projectFilter"
				:options="projectOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<USelectMenu
				v-model="dateRange"
				:options="dateRangeOptions"
				value-attribute="value"
				option-attribute="label"
				size="xs" />

			<UInput
				v-model="tagKeyword"
				size="xs"
				icon="i-lucide-hash"
				:placeholder="t('review.finishList.placeholders.tagKeyword')"
				class="w-40" />
		</section>

		<!-- 按 Project 分组的完成列表 -->
		<section class="space-y-3">
			<div
				v-if="projectGroups.length === 0 && !loading"
				class="text-sm text-muted">
				{{ t('review.finishList.empty') }}
			</div>

			<div
				v-for="(group, index) in projectGroups"
				:key="group.groupKey"
				v-motion="groupMotions[index]"
				class="rounded-xl border border-default bg-elevated/70">
				<header class="px-3 py-2.5 flex items-center justify-between gap-2 border-b border-default/70">
					<div class="flex items-center gap-2 min-w-0">
						<UIcon
							name="i-lucide-folder-check"
							class="size-4 text-amber-500" />
						<div class="flex flex-col min-w-0">
							<div class="text-sm font-medium truncate">{{ group.projectName }}</div>
							<div class="text-[11px] text-muted">
								{{ t('review.finishList.groupMeta', { space: group.spaceLabel, count: group.tasks.length }) }}
							</div>
						</div>
					</div>

					<UBadge
						color="success"
						variant="soft"
						size="xs">
						{{ t('review.finishList.medianLead', { value: group.medianLead }) }}
					</UBadge>
				</header>

				<div class="divide-y divide-default/60">
					<div
						v-for="task in group.tasks"
						:key="task.id"
						class="px-3 py-2 flex items-center justify-between gap-3 text-sm">
						<div class="min-w-0">
							<div class="font-medium truncate">{{ task.title }}</div>
							<div class="text-[11px] text-muted">
								{{ t('review.finishList.completedAt') }} {{ formatDateTime(task.completedAt ?? 0) }} · Lead
								{{ formatDuration(task.completedAt && task.createdAt ? task.completedAt - task.createdAt : 0) }}
							</div>
						</div>
						<div class="flex items-center gap-1.5">
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								icon="i-lucide-message-circle"
								@click="onOpenReflection(task)">
								<span class="ml-1 text-[11px]">{{ t('review.finishList.reflectionAction') }}</span>
							</UButton>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- 完成感想记录入口（占位） -->
		<UModal
			v-model:open="reflectionOpen"
			:title="t('review.finishList.reflectionModal.title')"
			:description="t('review.finishList.reflectionModal.description')"
			:ui="reflectionModalUi">
			<template #body>
				<div
					v-motion="reflectionBodyMotion"
					class="space-y-3">
					<header class="space-y-1">
						<div class="flex items-center gap-2">
							<UIcon
								name="i-lucide-sparkles"
								class="size-4 text-pink-500" />
							<h2 class="text-sm font-semibold">{{ t('review.finishList.reflectionModal.heading') }}</h2>
						</div>
						<p class="text-xs text-muted">{{ t('review.finishList.reflectionModal.hint') }}</p>
					</header>

					<div class="space-y-1.5">
						<div class="text-xs text-muted">{{ t('review.finishList.reflectionModal.currentTask') }}</div>
						<div class="text-xs font-medium truncate">
							{{ reflectionTask?.title ?? t('review.finishList.reflectionModal.noTaskSelected') }}
						</div>
					</div>

					<UTextarea
						v-model="reflectionText"
						:placeholder="t('review.finishList.reflectionModal.placeholder')"
						:rows="5" />
				</div>
			</template>
			<template #footer>
				<div
					v-motion="reflectionFooterMotion"
					class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						@click="reflectionOpen = false">
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton
						color="primary"
						size="xs"
						@click="onReflectionSave">
						{{ t('review.finishList.reflectionModal.savePlaceholder') }}
					</UButton>
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { useReviewFinishListPageFacade } from '@/features/review'

	const {
		t,
		headerMotion,
		filtersMotion,
		reflectionBodyMotion,
		reflectionFooterMotion,
		loading,
		spaceFilter,
		projectFilter,
		dateRange,
		tagKeyword,
		reflectionOpen,
		reflectionTask,
		reflectionText,
		spaceOptions,
		projectOptions,
		dateRangeOptions,
		projectGroups,
		stats,
		groupMotions,
		reflectionModalUi,
		formatDateTime,
		formatDuration,
		onOpenReflection,
		onReflectionSave,
	} = useReviewFinishListPageFacade()
</script>
