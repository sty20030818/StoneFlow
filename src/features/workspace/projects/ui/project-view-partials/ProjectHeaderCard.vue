<template>
	<div
		v-if="project"
		class="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/85 p-6 shadow-[0_10px_28px_-24px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-900/80 dark:shadow-[0_14px_32px_-26px_rgba(0,0,0,0.52)]"
		:style="prioritySurfaceVars">
		<div class="surface-tint"></div>
		<div class="card-inner-border"></div>
		<div class="edge-glow"></div>
		<div class="top-rim"></div>

		<div class="relative z-10 space-y-3">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0 pl-3">
					<h1 class="truncate text-3xl font-semibold tracking-tight text-slate-900 dark:text-neutral-50">
						{{ project.title }}
					</h1>
				</div>

				<div class="flex items-center gap-2">
					<UBadge
						size="sm"
						variant="soft"
						class="rounded-full px-3.5 py-1.75 text-[11px] font-semibold uppercase tracking-widest"
						:color="statusColor">
						<span class="inline-flex items-center gap-2">
							<span
								class="size-1.5 rounded-full"
								:class="statusDotClass"></span>
							{{ statusLabel }}
						</span>
					</UBadge>
					<UButton
						color="neutral"
						variant="soft"
						size="xs"
						square
						icon="i-lucide-settings-2"
						class="bg-white/72 text-default ring-1 ring-white/45 transition-transform duration-200 ease-out hover:scale-105 hover:bg-white active:scale-100 dark:bg-white/8 dark:ring-white/10 dark:hover:bg-white/12"
						:ui="{
							base: 'size-8 rounded-full p-0 inline-flex items-center justify-center',
							leadingIcon: 'size-3.5',
						}"
						:aria-label="t('projectView.header.editProjectSettingsAria')"
						@click="emit('open-settings')" />
				</div>
			</div>

			<div class="max-w-[78%] pl-5 pr-12 text-base font-medium leading-relaxed text-muted line-clamp-2">
				{{ project.note || t('projectView.header.noNotes') }}
			</div>

			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-wrap gap-2 pl-4">
					<UBadge
						size="sm"
						color="neutral"
						variant="soft"
						class="rounded-full border border-slate-200/50 bg-slate-100/80 px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-slate-500 dark:border-white/8 dark:bg-white/6 dark:text-neutral-300">
						<span class="inline-flex items-center gap-2">
							<UIcon
								name="i-lucide-clock"
								class="size-3.5 text-slate-400/70 dark:text-neutral-400" />
							<span>{{ t('projectView.header.createdAt') }}</span>
							<span class="font-extrabold text-slate-700 dark:text-neutral-100">{{ createdAtLabel }}</span>
						</span>
					</UBadge>
					<UBadge
						size="sm"
						color="info"
						variant="soft"
						class="rounded-full border border-blue-100/50 bg-blue-50/80 px-3.5 py-1.5 text-[12px] font-bold tracking-wide text-blue-500 dark:border-blue-400/15 dark:bg-blue-500/10 dark:text-blue-200">
						<span class="inline-flex items-center gap-2">
							<UIcon
								name="i-lucide-edit"
								class="size-3.5 text-blue-400/80 dark:text-blue-200/80" />
							<span>{{ t('projectView.header.updatedAt') }}</span>
							<span class="font-extrabold text-blue-700 dark:text-blue-100">{{ updatedAtRelative }}</span>
						</span>
					</UBadge>
				</div>
				<div class="ml-auto flex items-end">
					<div
						class="flex items-center gap-3 rounded-[22px] px-6 py-3 shadow-md ring-1 ring-white/30"
						:class="priorityPillClass">
						<UIcon
							:name="priorityIconName"
							class="size-4 text-white/90" />
						<span class="text-sm font-black uppercase tracking-[0.12em] text-white">{{ priorityValue }}</span>
						<div class="h-3.5 w-px rounded-full bg-white/35 dark:bg-white/25"></div>
						<span class="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
							{{ priorityDisplayLabel.split(' ')[1] }}
						</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { computed } from 'vue'

	import type { WorkspaceProject } from '../../../shared/model'
	import {
		PROJECT_PRIORITY_DISPLAY,
		PROJECT_STATUS_DISPLAY,
		type ProjectPriorityValue,
		type ProjectComputedStatusValue,
	} from '@/config/project'

	const props = defineProps<{
		project: WorkspaceProject | null
	}>()
	const { t } = useI18n({ useScope: 'global' })
	const emit = defineEmits<{
		'open-settings': []
	}>()

	function formatTime(value: number | null) {
		if (!value) return t('projectView.header.noTime')
		const date = new Date(value)
		const yyyy = date.getFullYear()
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const dd = String(date.getDate()).padStart(2, '0')
		const hh = String(date.getHours()).padStart(2, '0')
		const min = String(date.getMinutes()).padStart(2, '0')
		return `${yyyy}.${mm}.${dd} ${hh}:${min}`
	}

	const priorityValue = computed<ProjectPriorityValue>(
		() => (props.project?.priority?.toUpperCase() as ProjectPriorityValue) || 'P1',
	)
	const priorityDisplay = computed(() => PROJECT_PRIORITY_DISPLAY[priorityValue.value] ?? PROJECT_PRIORITY_DISPLAY.P1)
	const priorityDisplayLabel = computed(() => priorityDisplay.value.label)
	const priorityPillClass = computed(() => priorityDisplay.value.pillClass)
	const prioritySurfaceVars = computed<Record<string, string>>(() => priorityDisplay.value.surfaceVars)

	const statusConfig = computed(() => {
		const status = (props.project?.computedStatus ?? 'inProgress') as ProjectComputedStatusValue
		return PROJECT_STATUS_DISPLAY[status] ?? PROJECT_STATUS_DISPLAY.inProgress
	})

	const statusLabel = computed(() => {
		const status = (props.project?.computedStatus ?? 'inProgress') as ProjectComputedStatusValue
		if (status === 'done') return t('project.status.done')
		if (status === 'archived') return t('project.status.archived')
		if (status === 'deleted') return t('project.status.deleted')
		return t('project.status.inProgress')
	})
	const statusColor = computed(() => statusConfig.value.color)
	const statusDotClass = computed(() => statusConfig.value.dot)

	const createdAtLabel = computed(() => formatTime(props.project?.createdAt ?? null))
	const updatedAtRelative = computed(() => formatRelativeTime(props.project?.updatedAt ?? null))

	function formatRelativeTime(value: number | null) {
		if (!value) return t('projectView.header.noTime')
		const diff = Date.now() - value
		if (diff < 0) return t('projectView.header.justNow')
		const minute = 60 * 1000
		const hour = 60 * minute
		const day = 24 * hour
		if (diff < minute) return t('projectView.header.justNow')
		if (diff < hour) {
			const mins = Math.floor(diff / minute)
			return t('projectView.header.minutesAgo', { count: mins })
		}
		if (diff < day) {
			const hours = Math.floor(diff / hour)
			return t('projectView.header.hoursAgo', { count: hours })
		}
		if (diff < 7 * day) {
			const days = Math.floor(diff / day)
			return t('projectView.header.daysAgo', { count: days })
		}
		return formatTime(value)
	}

	const priorityIconName = computed(() => priorityDisplay.value.iconName)
</script>

<style scoped>
	.surface-tint {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(135deg, var(--priority-color-soft) 0%, var(--priority-color-pale) 35%, transparent 75%);
		z-index: 0;
		transition: background 0.6s ease;
	}

	.card-inner-border {
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		border: 1.5px solid transparent;
		background: linear-gradient(135deg, var(--priority-color-border), transparent 40%) border-box;
		mask:
			linear-gradient(#fff 0 0) padding-box,
			linear-gradient(#fff 0 0);
		-webkit-mask:
			linear-gradient(#fff 0 0) padding-box,
			linear-gradient(#fff 0 0);
		-webkit-mask-composite: destination-out;
		mask-composite: exclude;
		z-index: 1;
	}

	.edge-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		background: linear-gradient(135deg, var(--glow-color) 0%, transparent 35%);
		opacity: 0.14;
		mask-image:
			linear-gradient(to bottom, black 0%, transparent 55%), linear-gradient(to right, black 0%, transparent 45%);
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
		z-index: 2;
	}

	.top-rim {
		position: absolute;
		top: 0;
		left: 24px;
		right: 24px;
		height: 1px;
		background: linear-gradient(to right, transparent, var(--priority-top-rim, rgba(255, 255, 255, 0.7)), transparent);
		z-index: 10;
	}

	:global(.dark) .top-rim {
		background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.12), transparent);
	}
</style>
