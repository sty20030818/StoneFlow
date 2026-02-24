<template>
	<section
		class="rounded-2xl border border-default/80 bg-elevated/35 p-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.55)]">
		<div class="flex items-center justify-between gap-4">
			<div class="min-w-0 space-y-2">
				<div class="flex items-center pl-5 gap-2">
					<p class="text-lg font-semibold text-muted uppercase tracking-wider">项目摘要</p>
					<!-- <UBadge
						size="sm"
						variant="soft"
						:color="statusBadgeColor"
						class="rounded-full px-[14px] py-[7px] text-[11px] font-semibold uppercase tracking-widest">
						<span class="inline-flex items-center gap-2">
							<span
								class="size-1.5 rounded-full"
								:class="statusDotClass"></span>
							{{ statusLabel }}
						</span>
					</UBadge> -->
				</div>

				<p class="flex items-center gap-2 text-[11px] text-muted">
					<UIcon
						name="i-lucide-calendar-clock"
						class="size-3.5 shrink-0 opacity-75" />
					<span>项目更新时间</span>
					<span class="font-semibold text-default">{{ projectUpdatedRelative }}</span>
				</p>

				<p class="flex items-center gap-2 text-[11px] text-muted">
					<UIcon
						name="i-lucide-history"
						class="size-3.5 shrink-0 opacity-75" />
					<span>最近任务更新时间</span>
					<span class="font-semibold text-default">{{ lastTaskUpdatedRelative }}</span>
				</p>
			</div>

			<div class="shrink-0">
				<UProgress
					:model-value="completionRate"
					:max="100"
					status
					color="success"
					size="lg"
					:ui="progressUi">
					<template #status="{ percent }">
						<div class="relative size-24">
							<div class="absolute inset-2 rounded-full bg-emerald-500/10 blur-[10px]"></div>
							<svg
								viewBox="0 0 96 96"
								class="relative size-24 -rotate-90">
								<circle
									:cx="RING_CENTER"
									:cy="RING_CENTER"
									:r="RING_RADIUS"
									stroke="currentColor"
									stroke-width="8"
									class="fill-none text-muted/20" />
								<circle
									:cx="RING_CENTER"
									:cy="RING_CENTER"
									:r="RING_RADIUS"
									stroke="currentColor"
									stroke-width="8"
									stroke-linecap="round"
									:stroke-dasharray="RING_CIRCUMFERENCE"
									:stroke-dashoffset="getProgressDashoffset(percent)"
									class="progress-ring fill-none text-emerald-500 transition-[stroke-dashoffset] duration-300 ease-out" />
							</svg>
							<div class="absolute inset-0 flex items-center justify-center">
								<div
									class="flex size-16 items-center justify-center rounded-full border border-default/70 bg-default shadow-[0_8px_24px_-18px_rgba(0,0,0,0.55)]">
									<span class="tabular-nums text-[18px] leading-none font-black tracking-tight text-default">
										{{ normalizePercent(percent) }}%
									</span>
								</div>
							</div>
						</div>
					</template>
				</UProgress>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	type Props = {
		statusBadgeColor: 'success' | 'warning' | 'info' | 'neutral' | 'error'
		statusDotClass: string
		statusLabel: string
		todoTaskCount: number
		doneTaskCount: number
		projectUpdatedAt: number | null
		lastTaskUpdatedAt: number | null
	}

	const props = defineProps<Props>()

	const totalTaskCount = computed(() => props.todoTaskCount + props.doneTaskCount)
	const completionRate = computed(() => {
		if (totalTaskCount.value <= 0) return 0
		return Math.round((props.doneTaskCount / totalTaskCount.value) * 100)
	})

	const projectUpdatedRelative = computed(() => formatRelativeTime(props.projectUpdatedAt, '暂无更新'))
	const lastTaskUpdatedRelative = computed(() => formatRelativeTime(props.lastTaskUpdatedAt, '尚无任务更新'))

	const progressUi = {
		root: 'relative size-24 overflow-visible',
		base: 'sr-only',
		indicator: 'sr-only',
		status:
			'absolute inset-0 !w-full !h-full !max-w-none !max-h-none m-0 flex items-center justify-center overflow-visible transition-none [transform:none] [filter:none]',
	}
	const RING_SIZE = 96
	const RING_CENTER = RING_SIZE / 2
	const RING_RADIUS = 40
	const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

	function normalizePercent(value: number | undefined): number {
		if (typeof value !== 'number' || Number.isNaN(value)) return 0
		return Math.max(0, Math.min(100, Math.round(value)))
	}

	function getProgressDashoffset(percent: number | undefined): number {
		const value = normalizePercent(percent)
		return RING_CIRCUMFERENCE * (1 - value / 100)
	}

	function formatRelativeTime(timestamp: number | null, fallback: string): string {
		if (!timestamp) return fallback
		const diff = Date.now() - timestamp
		if (diff <= 0) return 'just now'

		const minute = 60 * 1000
		const hour = 60 * minute
		const day = 24 * hour

		if (diff < minute) return 'just now'
		if (diff < hour) {
			const minutes = Math.floor(diff / minute)
			return `${minutes} min${minutes === 1 ? '' : 's'} ago`
		}
		if (diff < day) {
			const hours = Math.floor(diff / hour)
			return `${hours} hour${hours === 1 ? '' : 's'} ago`
		}
		const days = Math.floor(diff / day)
		if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`

		const date = new Date(timestamp)
		const yyyy = date.getFullYear()
		const mm = String(date.getMonth() + 1).padStart(2, '0')
		const dd = String(date.getDate()).padStart(2, '0')
		return `${yyyy}.${mm}.${dd}`
	}
</script>

<style scoped>
	.progress-ring {
		filter: drop-shadow(0 0 3px rgb(16 185 129 / 0.35));
	}
</style>
