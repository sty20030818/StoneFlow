<template>
	<SettingsSectionCard card-class="bg-default">
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<div>
					<div class="mt-0.5 text-sm font-semibold">{{ t('settings.remoteSync.actionsCard.title') }}</div>
					<div class="text-[11px] text-muted">{{ statusMessage }}</div>
				</div>
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
						:disabled="!hasActiveProfile || isSyncing"
						icon="i-lucide-activity"
						@click="onTestCurrent">
						{{ t('settings.remoteSync.actions.testCurrent') }}
					</UButton>
				</div>
			</div>
		</template>

		<UButton
			block
			color="primary"
			variant="solid"
			size="xl"
			icon="i-lucide-refresh-cw"
			:loading="isSyncingNow"
			:disabled="!hasActiveProfile || isPushing || isPulling"
			@click="onSyncNow">
			{{ t('settings.remoteSync.actions.syncNow') }}
		</UButton>
		<div class="mt-2 rounded-xl border border-default/70 bg-elevated/40 px-3 py-2">
			<div class="text-[11px] text-muted">
				{{ t('settings.remoteSync.actionsCard.lastSynced', { text: lastSyncedText }) }}
			</div>
			<div class="text-[10px] leading-5 text-muted/80">
				{{ t('settings.remoteSync.actionsCard.syncNowSummary', { pull: lastPullSummaryText, push: lastPushSummaryText }) }}
			</div>
		</div>

		<div class="mt-3 rounded-xl border border-default/70 bg-elevated/30 p-2.5">
			<button
				class="w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-default/60"
				type="button"
				@click="toggleAdvancedActions">
				<div class="flex items-center justify-between gap-2">
					<div class="text-[11px] text-muted">{{ t('settings.remoteSync.actionsCard.advancedTitle') }}</div>
					<div class="flex items-center gap-1">
						<div class="text-[10px] text-muted">
							{{ showAdvancedActions ? t('settings.remoteSync.actionsCard.hideAdvanced') : t('settings.remoteSync.actionsCard.showAdvanced') }}
						</div>
						<UIcon
							name="i-lucide-chevron-down"
							class="h-4 w-4 text-muted transition-transform"
							:class="showAdvancedActions ? 'rotate-180' : ''" />
					</div>
				</div>
			</button>
			<div
				v-if="showAdvancedActions"
				class="mt-2 grid grid-cols-2 gap-3">
				<div class="space-y-2">
					<UButton
						block
						color="primary"
						variant="soft"
						size="lg"
						icon="i-lucide-cloud-upload"
						:loading="isPushing"
						:disabled="isSyncing || !hasActiveProfile"
						@click="onPush">
						{{ t('common.actions.upload') }}
					</UButton>
					<div class="text-center text-[11px] text-muted">
						{{ t('settings.remoteSync.actionsCard.lastPushed', { text: lastPushedText }) }}
					</div>
					<div class="text-center text-[10px] leading-5 text-muted/80">{{ lastPushSummaryText }}</div>
				</div>
				<div class="space-y-2">
					<UButton
						block
						color="neutral"
						variant="outline"
						size="lg"
						icon="i-lucide-cloud-download"
						:loading="isPulling"
						:disabled="isSyncing || !hasActiveProfile"
						@click="onPull">
						{{ t('common.actions.download') }}
					</UButton>
					<div class="text-center text-[11px] text-muted">
						{{ t('settings.remoteSync.actionsCard.lastPulled', { text: lastPulledText }) }}
					</div>
					<div class="text-center text-[10px] leading-5 text-muted/80">{{ lastPullSummaryText }}</div>
				</div>
			</div>
		</div>

		<div class="mt-4 rounded-xl border border-default/70 bg-elevated/30 px-3 py-3">
			<div class="flex items-start justify-between gap-3">
				<div>
					<div class="text-[11px] font-medium text-default">{{ t('settings.remoteSync.autoSync.title') }}</div>
					<div class="mt-0.5 text-[10px] leading-5 text-muted/80">{{ autoSyncMetaText }}</div>
				</div>
				<UButton
					color="neutral"
					:variant="syncPreferences.enabled ? 'solid' : 'outline'"
					size="xs"
					@click="onUpdateAutoSyncEnabled(!syncPreferences.enabled)">
					{{ syncPreferences.enabled ? t('common.actions.done') : t('settings.remoteSync.status.label.missing') }}
				</UButton>
			</div>
			<div class="mt-3 grid gap-3 md:grid-cols-2">
				<div class="rounded-lg border border-default/70 bg-default px-2 py-2">
					<div class="text-[10px] text-muted">{{ t('settings.remoteSync.autoSync.interval') }}</div>
					<USelectMenu
						class="mt-1"
						:model-value="syncPreferences.intervalMinutes"
						:options="autoSyncIntervalOptions"
						value-attribute="value"
						option-attribute="label"
						size="sm"
						@update:model-value="(value) => onUpdateAutoSyncIntervalMinutes(Number(value))" />
				</div>
				<div class="rounded-lg border border-default/70 bg-default px-2 py-2">
					<div class="text-[10px] text-muted">{{ t('settings.remoteSync.autoSync.retryCount') }}</div>
					<USelectMenu
						class="mt-1"
						:model-value="syncPreferences.retryCount"
						:options="autoSyncRetryOptions"
						value-attribute="value"
						option-attribute="label"
						size="sm"
						@update:model-value="(value) => onUpdateAutoSyncRetryCount(Number(value))" />
				</div>
			</div>
			<div class="mt-3 flex flex-wrap gap-2">
				<UButton
					color="neutral"
					:size="'xs'"
					:variant="syncPreferences.runOnAppStart ? 'soft' : 'outline'"
					@click="onUpdateAutoSyncRunOnAppStart(!syncPreferences.runOnAppStart)">
					{{ t('settings.remoteSync.autoSync.runOnAppStart') }}
				</UButton>
				<UButton
					color="neutral"
					:size="'xs'"
					:variant="syncPreferences.runOnWindowFocus ? 'soft' : 'outline'"
					@click="onUpdateAutoSyncRunOnWindowFocus(!syncPreferences.runOnWindowFocus)">
					{{ t('settings.remoteSync.autoSync.runOnWindowFocus') }}
				</UButton>
			</div>
			<div class="mt-3 rounded-lg border border-default/70 bg-default px-2 py-2 text-[10px] text-muted/80">
				<div>{{ autoSyncStatusText }}</div>
				<div v-if="autoSyncLastError" class="mt-1 text-error">{{ autoSyncLastError }}</div>
			</div>
		</div>

		<div class="mt-4 rounded-xl border border-default/70 bg-elevated/30 p-2.5">
			<button
				class="w-full rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-default/60"
				type="button"
				@click="toggleDiagnostics">
				<div class="flex items-center justify-between gap-2">
					<div class="text-[11px] text-muted">{{ t('common.actions.details') }}</div>
					<div class="flex items-center gap-1">
						<div class="text-[10px] text-muted">
							{{ showDiagnostics ? t('common.actions.collapse') : t('common.actions.details') }}
						</div>
						<UIcon
							name="i-lucide-chevron-down"
							class="h-4 w-4 text-muted transition-transform"
							:class="showDiagnostics ? 'rotate-180' : ''" />
					</div>
				</div>
			</button>
			<div v-if="showDiagnostics" class="mt-2 space-y-3">
				<div
					v-if="!hasDiagnostic"
					class="rounded-xl border border-default/70 bg-default px-3 py-2 text-[11px] text-muted/80">
					{{ t('settings.remoteSync.history.empty') }}
				</div>
				<div v-if="latestDiagnosticSteps.length > 0" class="space-y-2">
					<div class="text-[11px] text-muted">{{ t('settings.remoteSync.actions.syncNow') }}</div>
					<div
						v-for="step in latestDiagnosticSteps"
						:key="step.id"
						class="rounded-xl border border-default/70 bg-default px-3 py-2">
						<div class="flex items-center justify-between gap-2 text-[11px] text-muted">
							<div>{{ step.label }}</div>
							<div class="shrink-0">{{ step.status }}</div>
						</div>
						<div v-if="step.summary" class="mt-1 text-[10px] leading-5 text-muted/80">{{ step.summary }}</div>
						<div v-if="step.fromCacheText" class="mt-1 text-[10px] text-muted/80">{{ step.fromCacheText }}</div>
						<div v-if="step.error" class="mt-1 text-[10px] leading-5 text-error">
							{{ step.error }}<span v-if="step.errorCode"> · {{ step.errorCode }}</span>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div
			v-if="syncError"
			class="mt-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
			{{ t('settings.remoteSync.actionsCard.syncFailed') }}: {{ syncError }}
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { ref } from 'vue'
	import { useI18n } from 'vue-i18n'

	import type { RemoteSyncPolicy } from '@/types/shared/remote-sync'

	import { SettingsSectionCard } from '../../../shared'

	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		isPushing: boolean
		isPulling: boolean
		testingCurrent: boolean
		isSyncingNow: boolean
		isSyncing: boolean
		hasActiveProfile: boolean
		statusBadgeVariant: string
		statusBadgeClass: string
		statusLabel: string
		statusMessage: string
		syncError: string | null
		lastSyncedText: string
		lastPushedText: string
		lastPulledText: string
		lastPushSummaryText: string
		lastPullSummaryText: string
		syncPreferences: RemoteSyncPolicy
		autoSyncIntervalOptions: Array<{ label: string; value: number }>
		autoSyncRetryOptions: Array<{ label: string; value: number }>
		autoSyncStatusText: string
		autoSyncMetaText: string
		autoSyncLastError: string | null
		hasDiagnostic: boolean
		latestDiagnosticSteps: Array<{
			id: string
			label: string
			status: 'success' | 'failed' | 'skipped'
			error: string | null
			errorCode: string | null
			summary: string | null
			fromCacheText: string | null
		}>
		onUpdateAutoSyncEnabled: (value: boolean) => void
		onUpdateAutoSyncIntervalMinutes: (value: number) => void
		onUpdateAutoSyncRetryCount: (value: number) => void
		onUpdateAutoSyncRunOnAppStart: (value: boolean) => void
		onUpdateAutoSyncRunOnWindowFocus: (value: boolean) => void
		onTestCurrent: () => void
		onSyncNow: () => void
		onPush: () => void
		onPull: () => void
	}>()

	const showAdvancedActions = ref(false)
	const showDiagnostics = ref(false)

	function toggleAdvancedActions() {
		showAdvancedActions.value = !showAdvancedActions.value
	}

	function toggleDiagnostics() {
		showDiagnostics.value = !showDiagnostics.value
	}
</script>
