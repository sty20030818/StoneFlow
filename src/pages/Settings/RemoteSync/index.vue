<template>
	<section class="max-w-5xl space-y-6">
		<div
			v-motion="actionsCardMotion"
			class="space-y-6 lg:sticky lg:top-4 lg:self-start">
			<RemoteSyncActionsCard
				:is-pushing="isPushing"
				:is-pulling="isPulling"
				:has-active-profile="hasActiveProfile"
				:sync-error="syncError"
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
				:on-push="handlePush"
				:on-pull="handlePull" />
		</div>

		<div
			v-motion="headerMotion"
			class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
			<div class="space-y-1">
				<div class="text-2xl font-semibold text-default">远端同步</div>
				<div class="text-sm text-muted">
					在应用内配置 Neon 数据库连接。支持多配置导入与切换，敏感信息使用 Stronghold 存储。
				</div>
			</div>
		</div>

		<div
			v-motion="contentGridMotion"
			class="grid gap-6 lg:grid-cols-[1.25fr,0.95fr]">
			<div class="space-y-6">
				<div v-motion="statusCardMotion">
					<RemoteSyncStatusCard
						:testing-current="testingCurrent"
						:has-active-profile="hasActiveProfile"
						:status-badge-variant="statusBadgeVariant"
						:status-badge-class="statusBadgeClass"
						:status-label="statusLabel"
						:status-message="statusMessage"
						:active-profile="activeProfile"
						:on-test-current="handleTestCurrent" />
				</div>

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
		</div>
	</section>

	<UModal
		v-model:open="createOpen"
		title="新建配置"
		description="创建新的远端同步配置"
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
					测试连接
				</UButton>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						@click="createOpen = false">
						取消
					</UButton>
					<UButton
						color="primary"
						variant="solid"
						:loading="savingNew"
						:disabled="!canSaveNew"
						icon="i-lucide-plus"
						@click="handleCreateProfile">
						保存
					</UButton>
				</div>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="editOpen"
		title="编辑配置"
		description="修改当前远端同步配置"
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
					测试连接
				</UButton>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						@click="editOpen = false">
						取消
					</UButton>
					<UButton
						color="primary"
						variant="solid"
						:loading="savingEdit"
						:disabled="!canSaveEdit"
						icon="i-lucide-save"
						@click="handleSaveEdit">
						保存
					</UButton>
				</div>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="importOpen"
		title="导入配置"
		description="从文本导入远端同步配置"
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
					取消
				</UButton>
				<UButton
					color="primary"
					variant="soft"
					:loading="importing"
					:disabled="!canImport"
					icon="i-lucide-upload"
					@click="handleImport">
					导入
				</UButton>
			</div>
		</template>
	</UModal>

	<UModal
		v-model:open="deleteOpen"
		title="删除配置"
		description="确认删除当前远端同步配置"
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
					取消
				</UButton>
				<UButton
					color="error"
					variant="solid"
					:loading="deleting"
					@click="confirmDelete">
					确认删除
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { useAppMotionPreset, useMotionPresetWithDelay } from '@/composables/base/motion'
	import { createModalLayerUi } from '@/config/ui-layer'
	import RemoteSyncActionsCard from './components/RemoteSyncActionsCard.vue'
	import RemoteSyncCreateForm from './components/RemoteSyncCreateForm.vue'
	import RemoteSyncDeleteBody from './components/RemoteSyncDeleteBody.vue'
	import RemoteSyncEditForm from './components/RemoteSyncEditForm.vue'
	import RemoteSyncImportForm from './components/RemoteSyncImportForm.vue'
	import RemoteSyncProfilesCard from './components/RemoteSyncProfilesCard.vue'
	import RemoteSyncStatusCard from './components/RemoteSyncStatusCard.vue'
	import { useRemoteSyncPage } from './composables/useRemoteSyncPage'

	const {
		isPushing,
		isPulling,
		syncError,
		hasActiveProfile,
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
		handlePush,
		handlePull,
		profiles,
		activeProfileId,
		activeProfile,
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
	const statusCardMotion = useAppMotionPreset('drawerSection', 'sectionBase', 48)
	const profilesCardMotion = useAppMotionPreset('drawerSection', 'sectionBase', 68)
	const modalBodyMotion = useMotionPresetWithDelay('modalSection', 24)
	const modalFooterMotion = useMotionPresetWithDelay('statusFeedback', 44)
</script>
