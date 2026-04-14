import { computed, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import type { CommandPaletteItem } from '@nuxt/ui'

import { COMMAND_PALETTE_KEY, OPEN_CREATE_PROJECT_MODAL_KEY, OPEN_CREATE_TASK_MODAL_KEY } from '@/app/injection-keys'
import { useAppShortcuts } from '@/app/logic/useAppShortcuts'
import { useNullableStringRouteQuery } from '@/shared/composables/base/route-query'
import { SPACE_DISPLAY, SPACE_IDS } from '@/shared/config/space'
import { createModalLayerUi } from '@/shared/config/ui-layer'
import {
	type CreateFlowProject,
	type CreateFlowTask,
	getWorkspaceProjectsSnapshot,
	refreshWorkspaceProjectsQuery,
	useInlineCreateFocusStore,
	useProjectTreeStore,
	useSpaceProjectsState,
} from '@/features/workspace'
import { useSettingsStore } from '@/app/stores/settings'

export function useAppOverlays() {
	const router = useRouter()
	const route = useRoute()
	const { t } = useI18n({ useScope: 'global' })
	const routeProjectId = useNullableStringRouteQuery('project')

	const commandPaletteOpen = ref(false)
	const createTaskModalOpen = ref(false)
	const createProjectModalOpen = ref(false)
	const createProjectModalSpaceId = ref<string>('work')

	const settingsStore = useSettingsStore()
	const projectTreeStore = useProjectTreeStore()
	const inlineCreateFocusStore = useInlineCreateFocusStore()
	const commandPaletteModalUi = createModalLayerUi({
		content: 'p-0',
	})

	const currentSpaceId = computed(() => {
		if (!settingsStore.loaded) return 'work'
		return settingsStore.settings.activeSpaceId ?? 'work'
	})

	const { projects: currentSpaceProjects } = useSpaceProjectsState(currentSpaceId)
	const currentProjects = computed<CreateFlowProject[]>(() => currentSpaceProjects.value)

	const currentRouteProjectId = computed<string | undefined>(() => {
		return routeProjectId.value ?? undefined
	})

	const commandGroups = computed(() => [
		{
			id: 'workspace',
			label: t('nav.groups.workspace'),
			items: [
				{
					label: t('commandPalette.items.allTasks'),
					icon: 'i-lucide-list-checks',
					to: `/space/${currentSpaceId.value}`,
				},
				...SPACE_IDS.map((id) => ({
					label: t(`spaces.${id}`),
					icon: SPACE_DISPLAY[id].icon,
					to: `/space/${id}`,
				})),
			],
		},
		{
			id: 'review',
			label: t('nav.groups.review'),
			items: [
				{ label: t('commandPalette.items.finishList'), icon: 'i-lucide-check-circle', to: '/finish-list' },
				{ label: t('commandPalette.items.stats'), icon: 'i-lucide-bar-chart-3', to: '/stats' },
				{ label: t('commandPalette.items.logs'), icon: 'i-lucide-scroll-text', to: '/logs' },
			],
		},
		{
			id: 'assets',
			label: t('nav.groups.assets'),
			items: [
				{ label: t('commandPalette.items.snippets'), icon: 'i-lucide-code', to: '/snippets' },
				{ label: t('commandPalette.items.vault'), icon: 'i-lucide-lock', to: '/vault' },
				{ label: t('commandPalette.items.notes'), icon: 'i-lucide-notebook', to: '/notes' },
			],
		},
		{
			id: 'settings',
			label: t('nav.groups.settings'),
			items: [
				{ label: t('commandPalette.items.appearance'), icon: 'i-lucide-palette', to: '/settings/appearance' },
				{ label: t('commandPalette.items.about'), icon: 'i-lucide-info', to: '/settings/about' },
				{ label: t('commandPalette.items.remoteSync'), icon: 'i-lucide-cloud', to: '/settings/remote-sync' },
			],
		},
	])

	function onCommandSelect(item: CommandPaletteItem) {
		if (!item?.to) return
		void router.push(item.to as string)
		commandPaletteOpen.value = false
	}

	function onTaskCreated(task: CreateFlowTask) {
		console.log('任务创建成功:', task)
	}

	function resolveTargetSpaceId(spaceId: string) {
		if ((SPACE_IDS as readonly string[]).includes(spaceId)) {
			return spaceId as (typeof SPACE_IDS)[number]
		}
		return settingsStore.settings.activeSpaceId
	}

	async function onProjectCreated(project: CreateFlowProject) {
		const targetSpaceId = resolveTargetSpaceId(project.spaceId)
		if (settingsStore.settings.activeSpaceId !== targetSpaceId) {
			await settingsStore.update({ activeSpaceId: targetSpaceId })
		}
		await refreshWorkspaceProjectsQuery(targetSpaceId, { force: true })
		await router.push({
			path: `/space/${targetSpaceId}`,
			query: { project: project.id },
		})
		await projectTreeStore.ensureProjectVisible(targetSpaceId, project.id, getWorkspaceProjectsSnapshot(targetSpaceId))
	}

	function openCreateProjectModal(spaceId?: string) {
		createProjectModalSpaceId.value = spaceId ?? currentSpaceId.value
		createProjectModalOpen.value = true
	}

	function openCreateTaskModal(_spaceId?: string) {
		createTaskModalOpen.value = true
	}

	provide(OPEN_CREATE_PROJECT_MODAL_KEY, openCreateProjectModal)
	provide(OPEN_CREATE_TASK_MODAL_KEY, openCreateTaskModal)
	provide(COMMAND_PALETTE_KEY, {
		open: () => {
			commandPaletteOpen.value = true
		},
	})

	useAppShortcuts(
		{ routePath: computed(() => route.path) },
		{
			toggleCommandPalette: () => {
				commandPaletteOpen.value = !commandPaletteOpen.value
			},
			openCreateProject: () => {
				openCreateProjectModal()
			},
			openCreateTask: () => {
				openCreateTaskModal()
			},
			focusInlineTaskCreator: () => {
				inlineCreateFocusStore.bumpTodoFocus()
			},
		},
	)

	return {
		commandPaletteOpen,
		createTaskModalOpen,
		createProjectModalOpen,
		createProjectModalSpaceId,
		commandPaletteModalUi,
		commandGroups,
		currentProjects,
		currentRouteProjectId,
		currentSpaceId,
		onCommandSelect,
		onTaskCreated,
		onProjectCreated,
		t,
	}
}
