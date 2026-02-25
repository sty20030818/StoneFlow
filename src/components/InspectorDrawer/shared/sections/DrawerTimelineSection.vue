<template>
	<section class="space-y-3">
		<button
			v-if="collapsible"
			type="button"
			class="flex items-center justify-between w-full"
			@click="onToggle">
			<div class="flex items-center gap-2">
				<label class="text-xs font-semibold text-muted uppercase tracking-widest">
					{{ t('inspector.timeline.label') }}
				</label>
				<UBadge
					size="xs"
					color="neutral"
					variant="soft">
					{{ timelineLogs.length }}
				</UBadge>
			</div>
			<UIcon
				name="i-lucide-chevron-down"
				class="size-4 text-muted transition-transform duration-200 ease-out"
				:class="isCollapsed ? 'rotate-0' : 'rotate-180'" />
		</button>

		<div
			v-else
			class="flex items-center justify-between">
			<label class="text-xs font-semibold text-muted uppercase tracking-widest">
				{{ t('inspector.timeline.label') }}
			</label>
			<UBadge
				size="xs"
				color="neutral"
				variant="soft">
				{{ timelineLogs.length }}
			</UBadge>
		</div>

		<div
			v-show="!isCollapsed"
			class="space-y-2">
			<div
				v-if="timelineLoading"
				class="rounded-xl border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
				{{ t('inspector.timeline.loading') }}...
			</div>

			<div
				v-else-if="timelineErrorMessage"
				class="rounded-xl border border-red-200/70 bg-red-50/50 px-3 py-2.5 space-y-2">
				<div class="text-xs text-red-600">{{ t('inspector.timeline.loadFailed') }}: {{ timelineErrorMessage }}</div>
				<UButton
					color="neutral"
					variant="soft"
					size="xs"
					icon="i-lucide-refresh-cw"
					@click="reloadTimeline">
					{{ t('common.actions.retry') }}
				</UButton>
			</div>

			<div
				v-else-if="timelineEmpty"
				class="rounded-xl border border-default/70 bg-elevated/60 px-3 py-2 text-xs text-muted">
				{{ t('inspector.timeline.empty') }}
			</div>

			<UTimeline
				v-else
				:items="timelineItems"
				size="sm" />
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { computed } from 'vue'

	import { toDrawerTimelineItems } from '../composables/useDrawerShared'
	import type { DrawerTimelineLogEntry } from '../types'

	type Props = {
		timelineLogs: DrawerTimelineLogEntry[]
		timelineLoading: boolean
		timelineEmpty: boolean
		timelineErrorMessage: string | null
		reloadTimeline: () => void | Promise<void>
		collapsible?: boolean
		collapsed?: boolean
		toggleCollapsed?: () => void
	}

	const props = withDefaults(defineProps<Props>(), {
		collapsible: true,
		collapsed: false,
		toggleCollapsed: undefined,
	})
	const { t } = useI18n({ useScope: 'global' })

	const timelineItems = computed(() => toDrawerTimelineItems(props.timelineLogs))
	const isCollapsed = computed(() => (props.collapsible ? props.collapsed : false))

	function onToggle() {
		props.toggleCollapsed?.()
	}
</script>
