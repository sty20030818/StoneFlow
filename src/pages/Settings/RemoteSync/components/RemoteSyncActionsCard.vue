<template>
	<SettingsSectionCard card-class="bg-default">
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<div class="text-sm font-semibold">{{ t('settings.remoteSync.actionsCard.title') }}</div>
				<div class="flex items-center gap-2">
					<UBadge
						color="neutral"
						:variant="statusBadgeVariant"
						:class="statusBadgeClass">
						{{ statusLabel }}
					</UBadge>
					<UButton
						color="primary"
						variant="soft"
						size="sm"
						:loading="testingCurrent"
						:disabled="!hasActiveProfile"
						icon="i-lucide-activity"
						@click="onTestCurrent">
						{{ t('settings.remoteSync.actions.testCurrent') }}
					</UButton>
				</div>
			</div>
		</template>

		<div class="grid grid-cols-2 gap-3">
			<div class="space-y-2">
				<UButton
					block
					color="primary"
					variant="solid"
					size="xl"
					icon="i-lucide-cloud-upload"
					:loading="isPushing"
					:disabled="isPulling || !hasActiveProfile"
					@click="onPush">
					{{ t('common.actions.upload') }}
				</UButton>
				<div class="text-center text-[11px] text-muted">
					{{ t('settings.remoteSync.actionsCard.lastPushed', { text: lastPushedText }) }}
				</div>
				<div class="text-center text-[10px] text-muted/80 leading-5">{{ lastPushSummaryText }}</div>
			</div>
			<div class="space-y-2">
				<UButton
					block
					color="neutral"
					variant="soft"
					size="xl"
					icon="i-lucide-cloud-download"
					:loading="isPulling"
					:disabled="isPushing || !hasActiveProfile"
					@click="onPull">
					{{ t('common.actions.download') }}
				</UButton>
				<div class="text-center text-[11px] text-muted">
					{{ t('settings.remoteSync.actionsCard.lastPulled', { text: lastPulledText }) }}
				</div>
				<div class="text-center text-[10px] text-muted/80 leading-5">{{ lastPullSummaryText }}</div>
			</div>
		</div>

		<div class="mt-4 space-y-2">
			<div class="flex items-center justify-between gap-2">
				<div class="text-[11px] text-muted">{{ t('settings.remoteSync.history.title') }}</div>
				<div class="flex items-center gap-2">
					<USelectMenu
						:model-value="historyFilter"
						:options="historyFilterOptions"
						value-attribute="value"
						option-attribute="label"
						size="xs"
						@update:model-value="(value) => onUpdateHistoryFilter(value as 'all' | 'push' | 'pull')" />
					<UButton
						color="neutral"
						variant="ghost"
						size="2xs"
						icon="i-lucide-trash-2"
						:loading="isClearingHistory"
						:disabled="recentSyncHistory.length === 0"
						@click="onClearHistory">
						{{ t('common.actions.clear') }}
					</UButton>
				</div>
			</div>
			<div
				v-if="recentSyncHistory.length === 0"
				class="rounded-xl border border-default/70 bg-elevated/40 px-3 py-2 text-[11px] text-muted/80">
				{{ t('settings.remoteSync.history.empty') }}
			</div>
			<template v-else>
				<div
					v-for="item in recentSyncHistory"
					:key="item.id"
					class="rounded-xl border border-default/70 bg-elevated/40 px-3 py-2">
					<div class="flex items-center justify-between gap-2 text-[11px] text-muted">
						<div class="truncate">{{ item.directionText }} · {{ item.profileName }}</div>
						<div class="shrink-0 flex items-center gap-1.5">
							<div class="text-[10px] text-muted/80">{{ item.syncedAtText }}</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								@click="toggleExpand(item.id)">
								{{ expandedHistoryId === item.id ? t('common.actions.collapse') : t('common.actions.details') }}
							</UButton>
						</div>
					</div>
					<div class="mt-1 text-[10px] leading-5 text-muted/80">{{ item.summary }}</div>
					<div
						v-if="expandedHistoryId === item.id"
						class="mt-2 rounded-lg border border-default/70 bg-default px-2 py-2 space-y-1">
						<div
							v-for="table in item.tables"
							:key="table.key"
							class="flex items-center justify-between gap-2 text-[10px] text-muted">
							<div>{{ table.label }}</div>
							<div class="shrink-0">
								{{
									t('settings.remoteSync.history.tableStats', {
										total: table.total,
										inserted: table.inserted,
										updated: table.updated,
										skipped: table.skipped,
									})
								}}
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>

		<div
			v-if="syncError"
			class="mt-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
			{{ t('settings.remoteSync.actionsCard.syncFailed') }}: {{ syncError }}
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { ref } from 'vue'

	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		isPushing: boolean
		isPulling: boolean
		testingCurrent: boolean
		hasActiveProfile: boolean
		statusBadgeVariant: string
		statusBadgeClass: string
		statusLabel: string
		syncError: string | null
		lastPushedText: string
		lastPulledText: string
		lastPushSummaryText: string
		lastPullSummaryText: string
		historyFilter: 'all' | 'push' | 'pull'
		historyFilterOptions: Array<{ label: string; value: 'all' | 'push' | 'pull' }>
		isClearingHistory: boolean
		recentSyncHistory: Array<{
			id: string
			direction: 'push' | 'pull'
			directionText: string
			profileName: string
			syncedAtText: string
			summary: string
			tables: Array<{
				key: string
				label: string
				total: number
				inserted: number
				updated: number
				skipped: number
			}>
		}>
		onUpdateHistoryFilter: (value: 'all' | 'push' | 'pull') => void
		onClearHistory: () => void
		onTestCurrent: () => void
		onPush: () => void
		onPull: () => void
	}>()

	const expandedHistoryId = ref<string | null>(null)

	function toggleExpand(id: string) {
		expandedHistoryId.value = expandedHistoryId.value === id ? null : id
	}
</script>
