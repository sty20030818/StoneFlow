<template>
	<section class="mx-auto w-full max-w-6xl space-y-6">
		<div
			v-motion="actionsCardMotion"
			class="space-y-6">
			<RemoteSyncActionsCard
				:is-pushing="isPushing"
				:is-pulling="isPulling"
				:testing-current="testingCurrent"
				:is-syncing-now="isSyncingNow"
				:is-syncing="isSyncing"
				:has-active-profile="hasActiveProfile"
				:status-badge-variant="statusBadgeVariant"
				:status-badge-class="statusBadgeClass"
				:status-label="statusLabel"
				:status-message="statusMessage"
				:sync-error="syncError"
				:last-synced-text="lastSyncedText"
				:last-pushed-text="lastPushedText"
				:last-pulled-text="lastPulledText"
				:last-push-summary-text="lastPushSummaryText"
				:last-pull-summary-text="lastPullSummaryText"
				:sync-preferences="syncPreferences"
				:auto-sync-interval-options="autoSyncIntervalOptions"
				:auto-sync-retry-options="autoSyncRetryOptions"
				:auto-sync-status-text="autoSyncStatusText"
				:auto-sync-meta-text="autoSyncMetaText"
				:auto-sync-last-error="autoSyncLastError"
				:has-diagnostic="hasDiagnostic"
				:latest-diagnostic-steps="latestDiagnosticSteps"
				:on-update-auto-sync-enabled="handleUpdateAutoSyncEnabled"
				:on-update-auto-sync-interval-minutes="handleUpdateAutoSyncIntervalMinutes"
				:on-update-auto-sync-retry-count="handleUpdateAutoSyncRetryCount"
				:on-update-auto-sync-run-on-app-start="handleUpdateAutoSyncRunOnAppStart"
				:on-update-auto-sync-run-on-window-focus="handleUpdateAutoSyncRunOnWindowFocus"
				:on-test-current="handleTestCurrent"
				:on-sync-now="handleSyncNow"
				:on-push="handlePush"
				:on-pull="handlePull" />
		</div>

		<div
			v-motion="contentGridMotion"
			class="space-y-6">
			<div v-motion="profilesCardMotion">
				<RemoteSyncProfilesCard
					:profiles="profiles"
					:active-profile-id="activeProfileId"
					:format-profile-meta="formatProfileMeta"
					:on-open-create="openCreate"
					:on-open-import="openImport"
					:on-set-active="setActive"
					:on-open-edit="openEdit"
					:on-open-delete="openDelete" />
			</div>
		</div>
	</section>

	<UModal
		v-model:open="createOpen"
		:title="t('settings.remoteSync.modals.create.title')"
		:description="t('settings.remoteSync.modals.create.description')"
		:ui="remoteSyncModalUi">
		<template #body>
			<div v-motion="modalBodyMotion">
				<RemoteSyncCreateForm
					:name="newName"
					:url="newUrl"
					:on-update-name="(value) => (newName = value)"
					:on-update-url="(value) => (newUrl = value)" />
			</div>
		</template>
		<template #footer>
			<div
				v-motion="modalFooterMotion"
				class="flex w-full items-center justify-between gap-2">
				<UButton
					color="neutral"
					variant="soft"
					:loading="testingNew"
					:disabled="!canTestNew"
					icon="i-lucide-activity"
					@click="handleTestNew">
					{{ t('settings.remoteSync.actions.testConnection') }}
				</UButton>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						@click="createOpen = false">
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton
						color="primary"
						variant="solid"
						:loading="savingNew"
						:disabled="!canSaveNew"
						icon="i-lucide-plus"
						@click="handleCreateProfile">
						{{ t('common.actions.save') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="editOpen"
		:title="t('settings.remoteSync.modals.edit.title')"
		:description="t('settings.remoteSync.modals.edit.description')"
		:ui="remoteSyncModalUi">
		<template #body>
			<div v-motion="modalBodyMotion">
				<RemoteSyncEditForm
					:name="editName"
					:url="editUrl"
					:on-update-name="(value) => (editName = value)"
					:on-update-url="(value) => (editUrl = value)" />
			</div>
		</template>
		<template #footer>
			<div
				v-motion="modalFooterMotion"
				class="flex w-full items-center justify-between gap-2">
				<UButton
					color="neutral"
					variant="soft"
					:loading="testingEdit"
					:disabled="!canTestEdit"
					icon="i-lucide-activity"
					@click="handleTestEdit">
					{{ t('settings.remoteSync.actions.testConnection') }}
				</UButton>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						@click="editOpen = false">
						{{ t('common.actions.cancel') }}
					</UButton>
					<UButton
						color="primary"
						variant="solid"
						:loading="savingEdit"
						:disabled="!canSaveEdit"
						icon="i-lucide-save"
						@click="handleSaveEdit">
						{{ t('common.actions.save') }}
					</UButton>
				</div>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="importOpen"
		:title="t('settings.remoteSync.modals.import.title')"
		:description="t('settings.remoteSync.modals.import.description')"
		:ui="remoteSyncModalUi">
		<template #body>
			<div v-motion="modalBodyMotion">
				<RemoteSyncImportForm
					:text="importText"
					:error="importError"
					:on-update-text="(value) => (importText = value)" />
			</div>
		</template>
		<template #footer>
			<div
				v-motion="modalFooterMotion"
				class="flex items-center gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					@click="importOpen = false">
					{{ t('common.actions.cancel') }}
				</UButton>
				<UButton
					color="primary"
					variant="soft"
					:loading="importing"
					:disabled="!canImport"
					icon="i-lucide-upload"
					@click="handleImport">
					{{ t('common.actions.import') }}
				</UButton>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="deleteOpen"
		:title="t('settings.remoteSync.modals.delete.title')"
		:description="t('settings.remoteSync.modals.delete.description')"
		:ui="remoteSyncModalUi">
		<template #body>
			<div v-motion="modalBodyMotion">
				<RemoteSyncDeleteBody :name="deleteTarget?.name ?? ''" />
			</div>
		</template>
		<template #footer>
			<div
				v-motion="modalFooterMotion"
				class="flex items-center gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					@click="deleteOpen = false">
					{{ t('common.actions.cancel') }}
				</UButton>
				<UButton
					color="error"
					variant="solid"
					:loading="deleting"
					@click="confirmDelete">
					{{ t('common.actions.confirmDelete') }}
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import {
		RemoteSyncActionsCard,
		RemoteSyncCreateForm,
		RemoteSyncDeleteBody,
		RemoteSyncEditForm,
		RemoteSyncImportForm,
		RemoteSyncProfilesCard,
		useRemoteSyncPageFacade,
	} from '@/features/settings'

	const {
		t,
		remoteSyncModalUi,
		actionsCardMotion,
		contentGridMotion,
		profilesCardMotion,
		modalBodyMotion,
		modalFooterMotion,
		isPushing,
		isPulling,
		isSyncingNow,
		isSyncing,
		syncError,
		hasActiveProfile,
		lastSyncedText,
		lastPushedText,
		lastPulledText,
		lastPushSummaryText,
		lastPullSummaryText,
		syncPreferences,
		autoSyncIntervalOptions,
		autoSyncRetryOptions,
		autoSyncStatusText,
		autoSyncMetaText,
		autoSyncLastError,
		hasDiagnostic,
		latestDiagnosticSteps,
		handleUpdateAutoSyncEnabled,
		handleUpdateAutoSyncIntervalMinutes,
		handleUpdateAutoSyncRetryCount,
		handleUpdateAutoSyncRunOnAppStart,
		handleUpdateAutoSyncRunOnWindowFocus,
		handleSyncNow,
		handlePush,
		handlePull,
		profiles,
		activeProfileId,
		statusMessage,
		statusLabel,
		statusBadgeVariant,
		statusBadgeClass,
		testingCurrent,
		handleTestCurrent,
		openCreate,
		openImport,
		openEdit,
		setActive,
		openDelete,
		formatProfileMeta,
		createOpen,
		newName,
		newUrl,
		canSaveNew,
		canTestNew,
		testingNew,
		savingNew,
		handleTestNew,
		handleCreateProfile,
		editOpen,
		editName,
		editUrl,
		canSaveEdit,
		canTestEdit,
		testingEdit,
		savingEdit,
		handleTestEdit,
		handleSaveEdit,
		importOpen,
		importText,
		importError,
		canImport,
		importing,
		handleImport,
		deleteOpen,
		deleteTarget,
		deleting,
		confirmDelete,
	} = useRemoteSyncPageFacade()
</script>
