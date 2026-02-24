<template>
	<section class="space-y-3 rounded-2xl border border-default/80 bg-elevated/30 p-4">
		<div class="flex items-center justify-between">
			<p class="text-xs font-semibold text-muted">项目摘要</p>
			<UBadge
				size="sm"
				variant="soft"
				:color="statusBadgeColor">
				<span class="inline-flex items-center gap-1.5">
					<span
						class="size-1.5 rounded-full"
						:class="statusDotClass"></span>
					{{ statusLabel }}
				</span>
			</UBadge>
		</div>
		<div class="grid grid-cols-3 gap-2">
			<div class="rounded-xl border border-default/70 bg-default px-3 py-2">
				<div class="text-[11px] text-muted">待办任务</div>
				<div class="mt-1 text-base font-semibold text-default">{{ todoTaskCount }}</div>
			</div>
			<div class="rounded-xl border border-default/70 bg-default px-3 py-2">
				<div class="text-[11px] text-muted">已完成任务</div>
				<div class="mt-1 text-base font-semibold text-default">{{ doneTaskCount }}</div>
			</div>
			<div class="rounded-xl border border-default/70 bg-default px-3 py-2">
				<div class="text-[11px] text-muted">最近更新</div>
				<div class="mt-1 text-xs font-semibold text-default">{{ lastUpdatedLabel }}</div>
			</div>
		</div>
		<p class="text-[11px] text-muted">{{ shortcutHint }}</p>
	</section>
</template>

<script setup lang="ts">
	type Props = {
		statusBadgeColor: 'success' | 'warning' | 'info' | 'neutral' | 'error'
		statusDotClass: string
		statusLabel: string
		todoTaskCount: number
		doneTaskCount: number
		lastUpdatedLabel: string
		shortcutHint: string
	}

	defineProps<Props>()
</script>
