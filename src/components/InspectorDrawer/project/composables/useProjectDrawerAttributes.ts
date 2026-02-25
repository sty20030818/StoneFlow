import { useI18n } from 'vue-i18n'
import { computed, type Ref } from 'vue'

import { PROJECT_ICON, PROJECT_LEVEL_TEXT_CLASSES, type ProjectPriorityValue } from '@/config/project'
import type { SpaceDisplay } from '@/config/space'
import { TASK_PRIORITY_STYLES } from '@/config/task'
import type { DrawerAttributeOptionItem } from '@/components/InspectorDrawer/shared/attributes/DrawerAttributeOptionList.vue'

type SpaceOption = {
	value: string
	label: string
	icon: string
	iconClass: string
}

type PriorityOption = {
	value: ProjectPriorityValue
	label: string
	icon: string
	iconClass: string
}

type ParentOption = {
	value: string | null
	label: string
	depth: number
}

export function useProjectDrawerAttributes(params: {
	priorityLocal: Ref<ProjectPriorityValue>
	spaceIdLocal: Ref<string>
	parentIdLocal: Ref<string | null>
	priorityOptions: Ref<PriorityOption[]>
	spaceOptions: Ref<SpaceOption[]>
	parentOptions: Ref<ParentOption[]>
	rootLabel: Ref<string>
	isStructureLocked: Ref<boolean>
	hasChildProjects: Ref<boolean>
	isLifecycleBusy: Ref<boolean>
	isArchivingProject: Ref<boolean>
	isDeletingProject: Ref<boolean>
	canArchiveProject: Ref<boolean>
	canDeleteProject: Ref<boolean>
	statusDisplayValue: Ref<string>
	spaceDisplay: Ref<SpaceDisplay>
	onSpaceChange: (value: string) => void | Promise<void>
	onRequestArchiveProject: () => void
	onRequestDeleteProject: () => void
}) {
	const { t } = useI18n({ useScope: 'global' })
	const priorityOption = computed(() => {
		return (
			params.priorityOptions.value.find((item) => item.value === params.priorityLocal.value) ??
			params.priorityOptions.value[0]
		)
	})
	const priorityLabel = computed(() => priorityOption.value?.label ?? t('inspector.attribute.notSet'))
	const priorityIcon = computed(() => priorityOption.value?.icon ?? 'i-lucide-alert-triangle')

	const priorityStyle = computed(() => {
		const normalized = params.priorityLocal.value?.trim().toUpperCase() ?? ''
		const key =
			normalized === 'P0' || normalized === 'P1' || normalized === 'P2' || normalized === 'P3' ? normalized : 'default'
		return TASK_PRIORITY_STYLES[key]
	})

	const priorityCardClass = computed(() => priorityStyle.value.cardClass)
	const priorityIconClass = computed(() => priorityStyle.value.iconClass)
	const priorityTextClass = computed(() => priorityStyle.value.textClass)

	const priorityOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		return params.priorityOptions.value.map((option) => ({
			value: option.value,
			label: option.label,
			icon: option.icon,
			iconClass: option.iconClass,
			active: params.priorityLocal.value === option.value,
		}))
	})

	const statusCardClass = computed(() => {
		switch (params.statusDisplayValue.value) {
			case 'done':
				return 'bg-emerald-50/40 border-emerald-200'
			case 'archived':
				return 'bg-slate-50/70 border-slate-200'
			case 'deleted':
				return 'bg-rose-50/40 border-rose-200'
			default:
				return 'bg-amber-50/40 border-amber-200'
		}
	})

	const statusIconName = computed(() => {
		switch (params.statusDisplayValue.value) {
			case 'done':
				return 'i-lucide-check-circle-2'
			case 'archived':
				return 'i-lucide-archive'
			case 'deleted':
				return 'i-lucide-trash-2'
			default:
				return 'i-lucide-loader-circle'
		}
	})

	const statusIconClass = computed(() => {
		switch (params.statusDisplayValue.value) {
			case 'done':
				return 'text-emerald-500'
			case 'archived':
				return 'text-slate-500'
			case 'deleted':
				return 'text-rose-500'
			default:
				return 'text-amber-500'
		}
	})

	const statusTextClass = computed(() => {
		switch (params.statusDisplayValue.value) {
			case 'done':
				return 'text-emerald-600'
			case 'archived':
				return 'text-slate-600'
			case 'deleted':
				return 'text-rose-600'
			default:
				return 'text-amber-600'
		}
	})

	const statusActionAvailable = computed(() => params.canArchiveProject.value || params.canDeleteProject.value)
	const statusOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		const items: DrawerAttributeOptionItem[] = []
		if (params.canArchiveProject.value) {
			items.push({
				value: 'archive',
				label: t('inspector.project.actions.archive'),
				icon: 'i-lucide-archive',
				iconClass: 'text-amber-500',
				labelClass: 'text-amber-600',
				disabled: params.isLifecycleBusy.value && !params.isArchivingProject.value,
				loading: params.isArchivingProject.value,
			})
		}
		if (params.canDeleteProject.value) {
			items.push({
				value: 'delete',
				label: t('inspector.project.actions.delete'),
				icon: 'i-lucide-trash-2',
				iconClass: 'text-rose-500',
				labelClass: 'text-rose-600',
				disabled: params.isLifecycleBusy.value && !params.isDeletingProject.value,
				loading: params.isDeletingProject.value,
			})
		}
		return items
	})

	const spaceCardIcon = computed(() => params.spaceDisplay.value.icon)
	const spaceCardClass = computed(() => params.spaceDisplay.value.cardClass)
	const spaceCardLabelClass = computed(() => params.spaceDisplay.value.cardLabelClass)
	const spaceCardValueClass = computed(() => params.spaceDisplay.value.cardValueClass)

	const spaceOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		if (params.hasChildProjects.value) return []
		return params.spaceOptions.value.map((space) => ({
			value: space.value,
			label: space.label,
			icon: space.icon,
			iconClass: space.iconClass,
			active: params.spaceIdLocal.value === space.value,
		}))
	})

	const spaceOptionEmptyText = computed(() => {
		if (params.hasChildProjects.value) return t('inspector.project.spaceSwitchBlocked')
		return t('inspector.project.noAvailableSpace')
	})

	const currentParentLabel = computed(() => {
		const option = params.parentOptions.value.find((item) => item.value === params.parentIdLocal.value)
		return option?.label ?? params.rootLabel.value
	})

	const currentParentOption = computed(() => {
		return params.parentOptions.value.find((item) => item.value === params.parentIdLocal.value) ?? null
	})

	function getParentOptionIconClass(value: string | null, depth: number): string {
		if (value === null) return PROJECT_LEVEL_TEXT_CLASSES[0]
		return PROJECT_LEVEL_TEXT_CLASSES[Math.min(depth, PROJECT_LEVEL_TEXT_CLASSES.length - 1)]
	}

	function getParentOptionCardClass(value: string | null, depth: number): string {
		if (value === null) return 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/60'
		switch (Math.min(depth, PROJECT_LEVEL_TEXT_CLASSES.length - 1)) {
			case 0:
				return 'bg-amber-50/40 border-amber-200 hover:bg-amber-50/60'
			case 1:
				return 'bg-sky-50/40 border-sky-200 hover:bg-sky-50/60'
			case 2:
				return 'bg-violet-50/40 border-violet-200 hover:bg-violet-50/60'
			case 3:
				return 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/60'
			default:
				return 'bg-rose-50/40 border-rose-200 hover:bg-rose-50/60'
		}
	}

	const currentParentIconClass = computed(() => {
		const option = currentParentOption.value
		return getParentOptionIconClass(option?.value ?? null, option?.depth ?? 0)
	})

	const parentCardClass = computed(() => {
		const option = currentParentOption.value
		return getParentOptionCardClass(option?.value ?? null, option?.depth ?? 0)
	})

	const parentOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		return params.parentOptions.value.map((option) => ({
			value: option.value,
			label: option.label,
			icon: PROJECT_ICON,
			iconClass: getParentOptionIconClass(option.value, option.depth),
			indentPx: 12 + option.depth * 12,
			active: params.parentIdLocal.value === option.value,
		}))
	})

	function onPrioritySelect(value: string | number | boolean | null) {
		if (typeof value !== 'string') return
		params.priorityLocal.value = value as ProjectPriorityValue
	}

	async function onSpaceSelect(value: string | number | boolean | null) {
		if (typeof value !== 'string') return
		if (params.isStructureLocked.value || params.hasChildProjects.value) return
		await params.onSpaceChange(value)
	}

	function onParentSelect(value: string | number | boolean | null) {
		if (value !== null && typeof value !== 'string') return
		if (params.isStructureLocked.value) return
		params.parentIdLocal.value = value
	}

	function onStatusActionSelect(value: string | number | boolean | null) {
		if (value === 'archive') {
			params.onRequestArchiveProject()
			return
		}
		if (value === 'delete') {
			params.onRequestDeleteProject()
		}
	}

	return {
		priorityLabel,
		priorityIcon,
		priorityCardClass,
		priorityIconClass,
		priorityTextClass,
		priorityOptionItems,
		statusCardClass,
		statusIconName,
		statusIconClass,
		statusTextClass,
		statusActionAvailable,
		statusOptionItems,
		spaceCardIcon,
		spaceCardClass,
		spaceCardLabelClass,
		spaceCardValueClass,
		spaceOptionItems,
		spaceOptionEmptyText,
		currentParentLabel,
		currentParentIconClass,
		parentCardClass,
		parentOptionItems,
		onPrioritySelect,
		onSpaceSelect,
		onParentSelect,
		onStatusActionSelect,
	}
}
