import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import type { HeaderLeadingMode } from '@/shared/config/page-nav'
import { PROJECT_LEVEL_PILL_CLASSES } from '@/shared/config/project'
import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY } from '@/shared/config/space'
import { HEADER_CAPSULE_DANGER, HEADER_CAPSULE_NEUTRAL } from '@/shared/config/ui/capsule'
import { useProjectInteractionMotionPreset, useProjectShellMotionPreset } from '@/shared/composables/base/motion'
import { useSettingsStore } from '@/app/stores/settings'
import { useWorkspaceEditStore } from '@/features/workspace'

import type { AppHeaderLeadingPill } from './types'
import { useAppHeaderController } from './useAppHeader'

function resolveMetaText(
	t: ReturnType<typeof useI18n>['t'],
	meta: Record<string, unknown> | undefined,
	field: 'title' | 'description',
) {
	const keyField = field === 'title' ? 'titleKey' : 'descriptionKey'
	const fromKey = meta?.[keyField]
	if (typeof fromKey === 'string') return t(fromKey)
	const direct = meta?.[field]
	return typeof direct === 'string' ? direct : null
}

function isHeaderLeadingMode(value: unknown): value is HeaderLeadingMode {
	return value === 'page' || value === 'root'
}

export function useAppHeaderPresentation() {
	const route = useRoute()
	const { t } = useI18n({ useScope: 'global' })
	const settingsStore = useSettingsStore()
	const workspaceEditStore = useWorkspaceEditStore()
	const appHeaderController = useAppHeaderController()

	const headerShellMotion = useProjectShellMotionPreset('headerShell')
	const headerBreadcrumbMotion = useProjectShellMotionPreset('headerBreadcrumb')
	const headerActionsMotion = useProjectShellMotionPreset('headerActions')
	const editButtonMotion = useProjectInteractionMotionPreset('statusFeedback', 'stateAction')
	const editStripMotion = useProjectInteractionMotionPreset('statusFeedback', 'editStrip')

	const currentSpaceId = computed(() => {
		const spaceId = route.params.spaceId
		if (typeof spaceId === 'string') return spaceId
		return settingsStore.settings.activeSpaceId ?? 'work'
	})

	const fallbackLeadingPill = computed<AppHeaderLeadingPill | null>(() => {
		const spaceId = currentSpaceId.value
		if (typeof route.params.spaceId === 'string') {
			const display = SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY] ?? DEFAULT_SPACE_DISPLAY
			return {
				label: t(`spaces.${spaceId}`),
				icon: display.icon,
				pillClass: display.pillClass,
				to: `/space/${spaceId}`,
			}
		}

		const matchedRootRecord = route.matched.find((item) => {
			const title = resolveMetaText(t, item.meta as Record<string, unknown> | undefined, 'title')
			return item.meta?.leadingMode === 'root' && typeof title === 'string' && typeof item.meta?.icon === 'string'
		})
		if (matchedRootRecord) {
			const title = resolveMetaText(t, matchedRootRecord.meta as Record<string, unknown> | undefined, 'title')
			const icon = matchedRootRecord.meta?.icon
			if (typeof title === 'string' && typeof icon === 'string') {
				return {
					label: title,
					icon,
					pillClass:
						typeof matchedRootRecord.meta?.pillClass === 'string' ? matchedRootRecord.meta.pillClass : 'bg-slate-500',
				}
			}
		}

		const leafRecord = [...route.matched].reverse().find((item) => {
			const title = resolveMetaText(t, item.meta as Record<string, unknown> | undefined, 'title')
			return typeof title === 'string' && typeof item.meta?.icon === 'string'
		})
		const leadingMode = leafRecord?.meta?.leadingMode
		if (!isHeaderLeadingMode(leadingMode) || leadingMode === 'page') {
			const title = resolveMetaText(t, leafRecord?.meta as Record<string, unknown> | undefined, 'title')
			const icon = leafRecord?.meta?.icon
			if (typeof title === 'string' && typeof icon === 'string') {
				return {
					label: title,
					icon,
					pillClass: typeof leafRecord?.meta?.pillClass === 'string' ? leafRecord.meta.pillClass : 'bg-slate-500',
				}
			}
		}

		const record = route.matched.find((item) => {
			const title = resolveMetaText(t, item.meta as Record<string, unknown> | undefined, 'title')
			return typeof title === 'string' && typeof item.meta?.icon === 'string'
		})
		const title = resolveMetaText(t, record?.meta as Record<string, unknown> | undefined, 'title')
		const icon = record?.meta?.icon

		if (typeof title !== 'string' || typeof icon !== 'string') {
			return null
		}

		return {
			label: title,
			icon,
			pillClass: typeof record?.meta?.pillClass === 'string' ? record.meta.pillClass : 'bg-slate-500',
		}
	})

	const leadingPill = computed<AppHeaderLeadingPill | null>(() => {
		const leading = appHeaderController.state.value.leading
		if (!leading) return fallbackLeadingPill.value

		return {
			label: leading.label,
			icon: leading.icon,
			pillClass: leading.pillClass,
			to: leading.to,
		}
	})

	const breadcrumbItems = computed(() => appHeaderController.state.value.breadcrumb)
	const centerComponent = computed(() => appHeaderController.state.value.center)
	const rightPrimaryComponent = computed(() => appHeaderController.state.value.rightPrimary)
	const rightActionsComponent = computed(() => appHeaderController.state.value.rightActions)
	const showDefaultSearch = computed(() => appHeaderController.state.value.showDefaultSearch)

	const levelPalette = PROJECT_LEVEL_PILL_CLASSES
	const breadcrumbPillClass = (index: number) => levelPalette[index % levelPalette.length]

	const hasEditBridge = computed(() => workspaceEditStore.hasActiveContext)
	const isEditMode = computed(() => workspaceEditStore.isEditMode)
	const editSelectedCount = computed(() => workspaceEditStore.selectedCount)
	const editButtonLabel = computed(() => (isEditMode.value ? t('header.cancelEdit') : t('header.edit')))
	const editButtonIcon = computed(() => (isEditMode.value ? 'i-lucide-x' : 'i-lucide-pencil'))
	const editButtonClass = computed(() => {
		if (isEditMode.value) {
			return HEADER_CAPSULE_NEUTRAL
		}
		return HEADER_CAPSULE_DANGER
	})
	const editButtonIconClass = computed(() => 'text-current')
	const deleteGlowClass = computed(() => 'shadow-[0_18px_36px_-20px_rgba(239,68,68,0.85)]')

	function onToggleEditMode() {
		if (isEditMode.value) {
			workspaceEditStore.dispatchCommand('exit-edit-mode')
			return
		}
		workspaceEditStore.dispatchCommand('enter-edit-mode')
	}

	function onOpenDeleteConfirm() {
		workspaceEditStore.dispatchCommand('open-delete-confirm')
	}

	return {
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
	}
}
