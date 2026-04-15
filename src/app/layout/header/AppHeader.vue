<template>
	<header
		v-motion="headerShellMotion"
		data-tauri-drag-region
		:class="headerClass">
		<div
			data-tauri-drag-region
			class="app-desktop-drag relative flex h-16 items-center justify-between gap-4">
			<div
				ref="leadingGroupRef"
				v-motion="headerBreadcrumbMotion"
				data-tauri-drag-region
				:class="leadingGroupClass">
				<AppHeaderBreadcrumb
					:leading-pill="leadingPill"
					:items="breadcrumbItems"
					:pill-class="breadcrumbPillClass" />
			</div>

			<AppHeaderCenterHost
				:component="centerComponent"
				:overlay-style="centerOverlayStyle" />

			<div
				ref="trailingGroupRef"
				v-motion="headerActionsMotion"
				data-tauri-drag-region
				class="app-desktop-drag flex min-w-0 shrink-0 items-center gap-3">
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

				<div
					v-if="showWindowsWindowControls"
					class="app-desktop-no-drag grid h-10 w-[116px] shrink-0 grid-cols-3 overflow-hidden rounded-full border border-default/70 bg-default/78 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.24)] backdrop-blur-xl">
					<button
						type="button"
						class="grid h-full w-full place-items-center text-muted transition-colors hover:bg-default/92 hover:text-default"
						title="最小化"
						@click="onMinimizeWindow">
						<UIcon
							name="i-lucide-minus"
							class="size-4" />
					</button>
					<button
						type="button"
						class="grid h-full w-full place-items-center text-muted transition-colors hover:bg-default/92 hover:text-default"
						title="最大化或还原"
						@click="onToggleMaximizeWindow">
						<UIcon
							name="i-lucide-square"
							class="size-3.5" />
					</button>
					<button
						type="button"
						class="grid h-full w-full place-items-center text-muted transition-colors hover:bg-error hover:text-white"
						title="关闭"
						@click="onCloseWindow">
						<UIcon
							name="i-lucide-x"
							class="size-4" />
					</button>
				</div>
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
	import { computed, nextTick, onMounted, ref, useTemplateRef } from 'vue'
	import { useResizeObserver } from '@vueuse/core'
	import { useI18n } from 'vue-i18n'

	import AppHeaderBreadcrumb from './AppHeaderBreadcrumb.vue'
	import AppHeaderCenterHost from './AppHeaderCenterHost.vue'
	import AppHeaderRightHost from './AppHeaderRightHost.vue'
	import { detectDesktopShellPlatform, runDesktopWindowAction } from './desktop-shell'
	import { useAppHeaderPresentation } from './useAppHeaderPresentation'
	import WorkspaceEditStrip from './WorkspaceEditStrip.vue'

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
	const shellPlatform = detectDesktopShellPlatform()
	const isMacDesktopShell = shellPlatform === 'mac'
	const showWindowsWindowControls = shellPlatform === 'windows'
	const leadingGroupRef = useTemplateRef<HTMLElement>('leadingGroupRef')
	const trailingGroupRef = useTemplateRef<HTMLElement>('trailingGroupRef')
	const leadingGroupWidth = ref(0)
	const trailingGroupWidth = ref(0)

	function syncGroupWidths() {
		leadingGroupWidth.value = Math.ceil(leadingGroupRef.value?.getBoundingClientRect().width ?? 0)
		trailingGroupWidth.value = Math.ceil(trailingGroupRef.value?.getBoundingClientRect().width ?? 0)
	}

	useResizeObserver(leadingGroupRef, syncGroupWidths)
	useResizeObserver(trailingGroupRef, syncGroupWidths)

	onMounted(async () => {
		await nextTick()
		syncGroupWidths()
	})

	const headerClass = computed(() => [
		'z-layer-header shrink-0 border-b border-default/80 bg-default/78 px-5 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.26)] backdrop-blur-2xl',
	])

	const leadingGroupClass = computed(() => [
		'app-desktop-drag flex min-w-0 shrink items-center gap-2',
	])

	const centerOverlayStyle = computed<Record<string, string>>(() => {
		const horizontalPadding = Math.max(leadingGroupWidth.value, trailingGroupWidth.value) + 20
		return {
			paddingLeft: `${horizontalPadding}px`,
			paddingRight: `${horizontalPadding}px`,
		}
	})

	function onMinimizeWindow() {
		void runDesktopWindowAction('minimize')
	}

	function onToggleMaximizeWindow() {
		void runDesktopWindowAction('toggleMaximize')
	}

	function onCloseWindow() {
		void runDesktopWindowAction('close')
	}
</script>
