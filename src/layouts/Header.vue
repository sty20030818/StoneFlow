<template>
	<header
		v-motion="headerShellMotion"
		class="z-layer-header shrink-0 px-6 sticky top-0 bg-default/85 backdrop-blur-xl border-b border-default/80">
		<div class="relative h-16 flex items-center justify-between gap-4">
			<div
				v-motion="headerBreadcrumbMotion"
				class="flex items-center gap-2 min-w-0 flex-1">
				<AppHeaderBreadcrumb
					:leading-pill="leadingPill"
					:items="breadcrumbItems"
					:pill-class="breadcrumbPillClass" />
			</div>

			<AppHeaderCenterHost :component="centerComponent" />

			<div
				v-motion="headerActionsMotion"
				class="flex items-center gap-2 shrink-0">
				<AppHeaderRightHost
					:right-actions-component="rightActionsComponent"
					:right-primary-component="rightPrimaryComponent"
					:show-default-search="showDefaultSearch"
					:has-edit-bridge="hasEditBridge"
					:edit-button-motion="editButtonMotion"
					:edit-button-label="editButtonLabel"
					:edit-button-icon="editButtonIcon"
					:edit-button-class="editButtonClass"
					:edit-button-icon-class="editButtonIconClass"
					@toggle-edit="onToggleEditMode" />
			</div>
		</div>

		<WorkspaceEditStrip
			:visible="hasEditBridge && isEditMode"
			:selected-count="editSelectedCount"
			:motion="editStripMotion"
			:glow-class="deleteGlowClass"
			:label="t('header.delete')"
			@open-delete-confirm="onOpenDeleteConfirm" />
	</header>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'

	import AppHeaderBreadcrumb from './header/AppHeaderBreadcrumb.vue'
	import AppHeaderCenterHost from './header/AppHeaderCenterHost.vue'
	import AppHeaderRightHost from './header/AppHeaderRightHost.vue'
	import { useAppHeaderPresentation } from './header/useAppHeaderPresentation'
	import WorkspaceEditStrip from './header/WorkspaceEditStrip.vue'

	const { t } = useI18n({ useScope: 'global' })
	const {
		headerShellMotion,
		headerBreadcrumbMotion,
		headerActionsMotion,
		editButtonMotion,
		editStripMotion,
		leadingPill,
		breadcrumbItems,
		centerComponent,
		rightPrimaryComponent,
		rightActionsComponent,
		showDefaultSearch,
		breadcrumbPillClass,
		hasEditBridge,
		isEditMode,
		editSelectedCount,
		editButtonLabel,
		editButtonIcon,
		editButtonClass,
		editButtonIconClass,
		deleteGlowClass,
		onToggleEditMode,
		onOpenDeleteConfirm,
	} = useAppHeaderPresentation()
</script>
