<template>
	<section class="space-y-3">
		<button
			type="button"
			class="flex items-center justify-between w-full"
			@click="props.toggleTimeline">
			<div class="flex items-center gap-2">
				<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">操作日志</label>
				<UBadge
					size="xs"
					color="neutral"
					variant="soft">
					{{ props.timelineLogs.length }}
				</UBadge>
			</div>
			<UIcon
				name="i-lucide-chevron-down"
				v-motion="timelineChevronMotion"
				class="size-4 text-muted" />
		</button>
		<div
			v-show="!props.timelineCollapsed"
			class="space-y-2">
			<div
				v-if="props.timelineLoading"
				class="rounded-xl border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
				日志加载中...
			</div>

			<div
				v-else-if="props.timelineErrorMessage"
				class="rounded-xl border border-red-200/70 bg-red-50/50 px-3 py-2.5 space-y-2">
				<div class="text-xs text-red-600">日志加载失败：{{ props.timelineErrorMessage }}</div>
				<UButton
					color="neutral"
					variant="soft"
					size="xs"
					icon="i-lucide-refresh-cw"
					@click="props.reloadTimeline">
					重试
				</UButton>
			</div>

			<div
				v-else-if="props.timelineEmpty"
				class="rounded-xl border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
				暂无操作日志
			</div>

			<UTimeline
				v-else
				:items="timelineItems"
				size="sm" />
		</div>
	</section>
</template>

<script setup lang="ts">
	import type { MotionVariants } from '@vueuse/motion'
	import { computed } from 'vue'

	import { useMotionPreset } from '@/composables/base/motion'
	import type { ActivityLogEntry } from '@/services/api/logs'

	type TimelineItem = {
		title: string
		description: string
		date: string
		icon: string
	}

	const ACTION_ICON_MAP: Record<string, string> = {
		task_created: 'i-lucide-circle-plus',
		task_completed: 'i-lucide-check-circle-2',
		task_status_changed: 'i-lucide-refresh-cw',
		task_field_updated: 'i-lucide-pencil-line',
		task_deleted: 'i-lucide-trash-2',
		task_restored: 'i-lucide-undo-2',
	}

	type Props = {
		timelineLogs: ActivityLogEntry[]
		timelineLoading: boolean
		timelineEmpty: boolean
		timelineErrorMessage: string | null
		timelineCollapsed: boolean
		toggleTimeline: () => void
		reloadTimeline: () => void | Promise<void>
	}

	const props = defineProps<Props>()
	const statusFeedbackMotionPreset = useMotionPreset('statusFeedback')
	const timelineChevronMotion = computed<MotionVariants<string>>(() => ({
		initial: {
			rotate: props.timelineCollapsed ? 0 : 180,
		},
		enter: {
			rotate: props.timelineCollapsed ? 0 : 180,
			transition: statusFeedbackMotionPreset.value.enter?.transition,
		},
	}))

	function formatDateTime(ts: number): string {
		const d = new Date(ts)
		if (Number.isNaN(d.getTime())) return '时间未知'
		const date = d.toLocaleDateString('zh-CN')
		const time = d.toLocaleTimeString('zh-CN', {
			hour: '2-digit',
			minute: '2-digit',
		})
		return `${date} ${time}`
	}

	const timelineItems = computed<TimelineItem[]>(() => {
		return props.timelineLogs.map((item) => {
			return {
				title: item.actionLabel,
				description: item.detail || '无详情',
				date: formatDateTime(item.createdAt),
				icon: ACTION_ICON_MAP[item.action] ?? 'i-lucide-history',
			}
		})
	})
</script>
