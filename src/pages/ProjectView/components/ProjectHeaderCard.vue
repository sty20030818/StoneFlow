<template>
	<div
		v-if="project"
		class="mb-6 rounded-[28px] pt-6 pr-6 pb-6 pl-8 border border-white/60 bg-white/85 backdrop-blur-2xl shadow-sm relative overflow-hidden"
		:style="prioritySurfaceVars">
		<div class="surface-tint"></div>
		<div class="card-inner-border"></div>
		<div class="edge-glow"></div>
		<div class="top-rim"></div>

		<div class="relative z-10 space-y-3">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0 pl-3">
					<h1 class="text-3xl font-semibold text-slate-900 tracking-tight truncate">
						{{ project.title }}
					</h1>
				</div>

				<UBadge
					size="sm"
					variant="soft"
					class="rounded-full px-[14px] py-[7px] text-[11px] font-semibold uppercase tracking-widest"
					:color="statusColor">
					<span class="inline-flex items-center gap-2">
						<span
							class="size-1.5 rounded-full"
							:class="statusDotClass"></span>
						{{ statusLabel }}
					</span>
				</UBadge>
			</div>

			<div class="pl-5 pr-12 text-base text-slate-500 font-medium leading-relaxed line-clamp-2 max-w-[78%]">
				{{ project.note || 'No notes yet.' }}
			</div>

			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-wrap gap-2 pl-4">
					<UBadge
						size="sm"
						color="neutral"
						variant="soft"
						class="rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide bg-slate-100/80 text-slate-400 border border-slate-200/50">
						<span class="inline-flex items-center gap-2">
							<UIcon
								name="i-lucide-clock"
								class="size-3.5 text-slate-400/70" />
							<span>Created</span>
							<span class="text-slate-700 font-extrabold">{{ createdAtLabel }}</span>
						</span>
					</UBadge>
					<UBadge
						size="sm"
						color="info"
						variant="soft"
						class="rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide bg-blue-50/80 text-blue-400 border border-blue-100/50">
						<span class="inline-flex items-center gap-2">
							<UIcon
								name="i-lucide-edit"
								class="size-3.5 text-blue-400/80" />
							<span>Updated</span>
							<span class="text-blue-700 font-extrabold">{{ updatedAtRelative }}</span>
						</span>
					</UBadge>
				</div>
				<div class="ml-auto flex items-end">
					<div
						class="flex items-center gap-3 rounded-[22px] px-[24px] py-[12px] shadow-md ring-1 ring-white/30"
						:class="priorityPillClass">
						<UIcon
							:name="priorityIconName"
							class="size-4 text-white/90" />
						<span class="text-sm font-black uppercase tracking-[0.12em] text-white">{{ priorityValue }}</span>
						<div class="h-3.5 w-px rounded-full bg-white/35"></div>
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
	import { computed } from 'vue'

	import type { ProjectDto } from '@/services/api/projects'
	import {
		PROJECT_PRIORITY_DISPLAY,
		PROJECT_STATUS_DISPLAY,
		type ProjectPriorityValue,
		type ProjectComputedStatusValue,
	} from '@/config/project'

	const props = defineProps<{
		project: ProjectDto | null
	}>()

	function formatTime(value: number | null) {
		if (!value) return '—'
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

	const statusLabel = computed(() => statusConfig.value.label)
	const statusColor = computed(() => statusConfig.value.color)
	const statusDotClass = computed(() => statusConfig.value.dot)

	const createdAtLabel = computed(() => formatTime(props.project?.createdAt ?? null))
	const updatedAtRelative = computed(() => formatRelativeTime(props.project?.updatedAt ?? null))

	function formatRelativeTime(value: number | null) {
		if (!value) return '—'
		const diff = Date.now() - value
		if (diff < 0) return 'just now'
		const minute = 60 * 1000
		const hour = 60 * minute
		const day = 24 * hour
		if (diff < minute) return 'just now'
		if (diff < hour) {
			const mins = Math.floor(diff / minute)
			return `${mins} min${mins === 1 ? '' : 's'} ago`
		}
		if (diff < day) {
			const hours = Math.floor(diff / hour)
			return `${hours} hour${hours === 1 ? '' : 's'} ago`
		}
		if (diff < 7 * day) {
			const days = Math.floor(diff / day)
			return `${days} day${days === 1 ? '' : 's'} ago`
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
		background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.7), transparent);
		z-index: 10;
	}
</style>
