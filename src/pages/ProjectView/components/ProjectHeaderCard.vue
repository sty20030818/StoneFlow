<template>
	<div
		v-if="project"
		class="mb-6 rounded-[28px] pt-6 pr-6 pb-6 pl-8 border border-white/60 bg-white/70 backdrop-blur-2xl shadow-sm relative overflow-hidden"
		:class="prioritySurfaceClass"
		:style="{ '--glow-color': priorityGlowColor }">
		<div class="edge-glow"></div>
		<div class="top-rim"></div>

		<div class="relative z-0 space-y-3">
			<div class="flex items-start justify-between gap-4">
				<div class="min-w-0 pl-3">
					<h1 class="text-3xl font-semibold text-slate-900 tracking-tight truncate">
						{{ project.name }}
					</h1>
				</div>

				<UBadge
					size="sm"
					variant="soft"
					class="rounded-full px-[14px] py-[7px] text-[12px] font-bold tracking-widest"
					:color="statusColor">
					<span class="inline-flex items-center gap-2">
						<span
							class="size-1.5 rounded-full"
							:class="statusDotClass"></span>
						{{ statusLabel }}
					</span>
				</UBadge>
			</div>

			<div class="pl-5 pr-12 text-base text-slate-600 leading-relaxed line-clamp-2 max-w-[78%]">
				{{ project.note || 'No notes yet.' }}
			</div>

			<div class="flex items-center justify-between gap-4">
				<div class="flex flex-wrap gap-2 pl-4">
					<UBadge
						size="sm"
						color="neutral"
						variant="soft"
						class="rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide bg-slate-100/80 text-slate-500 border border-slate-200/50">
						<span class="inline-flex items-center gap-2">
							<UIcon
								name="i-lucide-clock"
								class="size-3.5 text-slate-500" />
							Created: {{ createdAtLabel }}
						</span>
					</UBadge>
					<UBadge
						size="sm"
						color="info"
						variant="soft"
						class="rounded-full px-3.5 py-1.5 text-[12px] font-bold tracking-wide bg-blue-50/80 text-blue-600 border border-blue-100/50">
						<span class="inline-flex items-center gap-2">
							<UIcon
								name="i-lucide-edit"
								class="size-3.5 text-blue-500" />
							Updated: {{ updatedAtRelative }}
						</span>
					</UBadge>
				</div>
				<div class="ml-auto flex items-end">
					<div
						class="flex items-center gap-3 rounded-[20px] px-[22px] py-[11px] shadow-sm"
						:class="priorityPillClass">
						<span class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{{ priorityValue }}</span>
						<div class="h-3.5 w-1.5 rounded-full bg-white/30"></div>
						<span class="text-xs font-black uppercase tracking-wider">{{ priorityDisplayLabel.split(' ')[1] }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import type { ProjectDto } from '@/services/api/projects'

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

	const priorityValue = computed(() => props.project?.priority?.toUpperCase() || 'P1')
	const priorityDisplayLabel = computed(() => {
		if (priorityValue.value === 'P0') return 'P0 Critical'
		if (priorityValue.value === 'P1') return 'P1 High'
		if (priorityValue.value === 'P2') return 'P2 Medium'
		return 'P3 Low'
	})

	const priorityPillClass = computed(() => {
		if (priorityValue.value === 'P0') return 'bg-rose-500 text-white shadow-rose-200'
		if (priorityValue.value === 'P1') return 'bg-amber-400 text-white shadow-amber-100'
		if (priorityValue.value === 'P2') return 'bg-blue-400 text-white shadow-blue-100'
		return 'bg-slate-400 text-white shadow-slate-200'
	})

	const prioritySurfaceClass = computed(() => {
		if (priorityValue.value === 'P0') return 'bg-rose-50/70'
		if (priorityValue.value === 'P1') return 'bg-amber-50/70'
		if (priorityValue.value === 'P2') return 'bg-blue-50/70'
		return 'bg-slate-50/70'
	})

	const priorityGlowColor = computed(() => {
		if (priorityValue.value === 'P0') return '#f43f5e'
		if (priorityValue.value === 'P1') return '#f59e0b'
		if (priorityValue.value === 'P2') return '#3b82f6'
		return '#94a3b8'
	})

	const statusConfig = computed(() => {
		const status = props.project?.status?.toLowerCase() ?? ''
		if (props.project?.archived_at) {
			return { label: 'Archived', color: 'neutral' as const, dot: 'bg-slate-400' }
		}
		if (status.includes('pause')) return { label: 'Paused', color: 'warning' as const, dot: 'bg-amber-500' }
		if (status.includes('done') || status.includes('finish')) {
			return { label: 'Done', color: 'info' as const, dot: 'bg-blue-500' }
		}
		if (status.includes('active')) return { label: 'Doing', color: 'success' as const, dot: 'bg-emerald-500' }
		return { label: status ? status.toUpperCase() : 'Doing', color: 'neutral' as const, dot: 'bg-slate-400' }
	})

	const statusLabel = computed(() => statusConfig.value.label)
	const statusColor = computed(() => statusConfig.value.color)
	const statusDotClass = computed(() => statusConfig.value.dot)

	const createdAtLabel = computed(() => formatTime(props.project?.created_at ?? null))
	const updatedAtRelative = computed(() => formatRelativeTime(props.project?.updated_at ?? null))

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
</script>

<style scoped>
	.edge-glow {
		position: absolute;
		inset: 0;
		pointer-events: none;
		border-radius: inherit;
		background: linear-gradient(135deg, var(--glow-color) 0%, transparent 35%);
		opacity: 0.16;
		mask-image:
			linear-gradient(to bottom, black 0%, transparent 55%), linear-gradient(to right, black 0%, transparent 35%);
		-webkit-mask-composite: source-in;
		mask-composite: intersect;
	}

	.top-rim {
		position: absolute;
		top: 0;
		left: 32px;
		right: 32px;
		height: 1px;
		background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.7), transparent);
		z-index: 10;
	}
</style>
