<template>
	<section class="mx-auto w-full max-w-6xl space-y-6">
		<div
			v-motion="headerMotion"
			class="flex flex-col gap-2">
			<div class="space-y-1">
				<div class="text-2xl font-semibold text-default">{{ t('settings.remoteSync.title') }}</div>
				<div class="text-sm text-muted">
					{{ t('settings.remoteSync.description') }}
				</div>
			</div>
		</div>

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
				:history-filter="historyFilter"
				:history-filter-options="historyFilterOptions"
				:is-clearing-history="isClearingHistory"
				:recent-sync-history="recentSyncHistory"
				:on-update-history-filter="setHistoryFilter"
				:on-clear-history="handleClearSyncHistory"
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
	import { useI18n } from 'vue-i18n'
	import { useAppMotionPreset, useMotionPresetWithDelay } from '@/composables/base/motion'
	import { createModalLayerUi } from '@/config/ui-layer'
	import RemoteSyncActionsCard from './components/RemoteSyncActionsCard.vue'
	import RemoteSyncCreateForm from './components/RemoteSyncCreateForm.vue'
	import RemoteSyncDeleteBody from './components/RemoteSyncDeleteBody.vue'
	import RemoteSyncEditForm from './components/RemoteSyncEditForm.vue'
	import RemoteSyncImportForm from './components/RemoteSyncImportForm.vue'
	import RemoteSyncProfilesCard from './components/RemoteSyncProfilesCard.vue'
	import { useRemoteSyncPage } from './composables/useRemoteSyncPage'
	const { t } = useI18n({ useScope: 'global' })

	const {
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
		historyFilter,
		historyFilterOptions,
		isClearingHistory,
		recentSyncHistory,
		setHistoryFilter,
		handleClearSyncHistory,
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
	} = useRemoteSyncPage()

	const remoteSyncModalUi = createModalLayerUi()
	const actionsCardMotion = useAppMotionPreset('drawerSection', 'sectionBase')
	const headerMotion = useAppMotionPreset('drawerSection', 'sectionBase', 16)
	const contentGridMotion = useAppMotionPreset('drawerSection', 'sectionBase', 30)
	const profilesCardMotion = useAppMotionPreset('drawerSection', 'sectionBase', 48)
	const modalBodyMotion = useMotionPresetWithDelay('modalSection', 24)
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 44)
</script>
