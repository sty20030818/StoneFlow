<template>
	<UCard
		variant="subtle"
		class="group border border-default/80 bg-default/80 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.32)] transition-[background-color,border-color,box-shadow] duration-200 ease-out hover:border-default hover:bg-elevated/72 hover:shadow-[0_16px_34px_-24px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-neutral-900/82 dark:hover:bg-neutral-900/92 dark:shadow-[0_18px_36px_-30px_rgba(0,0,0,0.6)] dark:hover:shadow-[0_14px_28px_-24px_rgba(0,0,0,0.52)]"
		:ui="{
			root: 'rounded-xl',
			body: 'p-2.5 sm:p-2.5',
		}">
		<div class="flex items-center gap-2.5">
			<button
				type="button"
				class="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left outline-none disabled:cursor-default"
				:class="primaryActionClass"
				:aria-label="primaryActionLabel"
				:title="primaryActionLabel"
				:disabled="primaryDisabled"
				@click="void handlePrimaryAction()">
				<UChip
					:color="chipColor"
					position="bottom-right"
					inset>
					<div :class="iconShellClass">
						<UIcon
							:name="iconName"
							:class="iconClass" />
					</div>
				</UChip>

				<div class="flex min-w-0 flex-1 flex-col">
					<div class="flex min-w-0 items-center gap-1.5">
						<span class="truncate text-[13px] font-medium text-default">{{ title }}</span>
						<span :class="statusBadgeClass">{{ statusLabel }}</span>
					</div>
					<span
						class="truncate text-[11px]"
						:class="subtitleClass">
						{{ subtitle }}
					</span>
				</div>
			</button>

			<RouterLink
				:to="settingsTo"
				class="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors duration-200 hover:bg-elevated hover:text-default"
				:aria-label="settingsActionLabel"
				:title="settingsActionLabel"
				@click.stop>
				<span v-motion="settingsIconHoverMotion">
					<UIcon
						name="i-lucide-settings"
						class="h-5 w-5" />
				</span>
			</RouterLink>
		</div>
	</UCard>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { useActionIconHoverMotion } from '@/shared/composables/base/motion'
	import { useRemoteSyncOverview } from '@/features/settings'

	const settingsIconHoverMotion = useActionIconHoverMotion({ hoverRotate: 90, hoverScale: 1 })
	const {
		state,
		title,
		statusLabel,
		subtitle,
		iconName,
		chipColor,
		primaryActionLabel,
		settingsActionLabel,
		primaryDisabled,
		settingsTo,
		handlePrimaryAction,
	} = useRemoteSyncOverview()

	const primaryActionClass = computed(() => {
		if (primaryDisabled.value) return 'opacity-80'
		return 'cursor-pointer'
	})

	const iconShellClass = computed(() => {
		const base =
			'flex h-10 w-10 items-center justify-center rounded-lg border shadow-[0_8px_18px_-16px_rgba(15,23,42,0.45)] transition-[background-color,border-color,color,box-shadow] duration-300'
		switch (state.value) {
			case 'booting':
			case 'syncing':
				return `${base} border-sky-200/80 bg-[linear-gradient(145deg,rgba(239,246,255,0.98),rgba(219,234,254,0.92))] text-sky-600 dark:border-sky-400/20 dark:bg-[linear-gradient(145deg,rgba(14,116,144,0.22),rgba(12,74,110,0.24))] dark:text-sky-200`
			case 'error':
				return `${base} border-rose-200/80 bg-[linear-gradient(145deg,rgba(255,241,242,0.98),rgba(255,228,230,0.92))] text-rose-600 dark:border-rose-400/20 dark:bg-[linear-gradient(145deg,rgba(159,18,57,0.2),rgba(136,19,55,0.24))] dark:text-rose-200`
			case 'success':
				return `${base} border-emerald-200/80 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(209,250,229,0.92))] text-emerald-600 dark:border-emerald-400/20 dark:bg-[linear-gradient(145deg,rgba(6,95,70,0.22),rgba(4,120,87,0.24))] dark:text-emerald-200`
			default:
				return `${base} border-default/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(241,245,249,0.88))] text-slate-500 dark:border-white/10 dark:bg-[linear-gradient(145deg,rgba(38,38,38,0.82),rgba(23,23,23,0.9))] dark:text-neutral-200`
		}
	})

	const iconClass = computed(() => {
		const base = 'h-5 w-5 transition-transform duration-300'
		return state.value === 'booting' || state.value === 'syncing'
			? `${base} animate-[spin_1.15s_linear_infinite]`
			: base
	})

	const statusBadgeClass = computed(() => {
		const base =
			'rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] transition-colors duration-300'
		switch (state.value) {
			case 'booting':
			case 'syncing':
				return `${base} border-sky-200/90 bg-sky-50/90 text-sky-600 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200`
			case 'error':
				return `${base} border-rose-200/90 bg-rose-50/90 text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200`
			case 'success':
				return `${base} border-emerald-200/90 bg-emerald-50/90 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200`
			default:
				return `${base} border-default/80 bg-default/70 text-muted dark:border-white/10 dark:bg-white/5 dark:text-neutral-300`
		}
	})

	const subtitleClass = computed(() => {
		switch (state.value) {
			case 'error':
				return 'text-rose-600 dark:text-rose-200'
			case 'success':
				return 'text-emerald-600 dark:text-emerald-200'
			case 'booting':
			case 'syncing':
				return 'text-sky-600 dark:text-sky-200'
			default:
				return 'text-muted'
		}
	})
</script>
