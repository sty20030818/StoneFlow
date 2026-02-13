<template>
	<!--
    Nuxt UI v4（Vue 项目）建议用 UApp 包裹根节点，
    否则 toast / tooltip / modal 等全局能力可能不可用。
  -->
	<UApp :toaster="{ position: 'bottom-right', duration: 3000, max: 5 }">
		<AppShell>
			<RouterView v-slot="{ Component, route: viewRoute }">
				<div
					:key="viewRoute.fullPath"
					v-motion="pageMotionPreset">
					<component :is="Component" />
				</div>
			</RouterView>
		</AppShell>

		<!-- 命令面板 -->
		<UModal
			v-model:open="commandPaletteOpen"
			title="命令面板"
			description="搜索页面并执行快捷操作"
			:ui="commandPaletteModalUi">
			<template #content>
				<UCommandPalette
					:groups="commandGroups"
					placeholder="搜索页面或操作..."
					class="h-80"
					@update:model-value="onCommandSelect" />
			</template>
		</UModal>

		<!-- 创建任务弹窗 -->
		<CreateTaskModal
			v-model="createTaskModalOpen"
			:space-id="currentSpaceId"
			:project-id="currentRouteProjectId"
			:projects="currentProjects"
			@created="onTaskCreated" />

		<!-- 创建项目弹窗 -->
		<CreateProjectModal
			v-model="createProjectModalOpen"
			:space-id="createProjectModalSpaceId"
			:projects="currentProjects"
			@created="onProjectCreated" />

		<!-- 更新通知 -->
		<UpdateNotification />
	</UApp>
</template>

<script setup lang="ts">
	import { computed, provide, ref } from 'vue'
	import { useRoute, useRouter } from 'vue-router'

	import type { CommandPaletteItem } from '@nuxt/ui'

	import { useAppShortcuts } from '@/composables/app/useAppShortcuts'
	import { useMotionPreset, useProjectMotionPreset } from '@/composables/base/motion'
	import { useNullableStringRouteQuery } from '@/composables/base/route-query'
	import CreateProjectModal from '@/components/CreateProjectModal'
	import CreateTaskModal from '@/components/CreateTaskModal'
	import { createModalLayerUi } from '@/config/ui-layer'
	import UpdateNotification from './components/UpdateNotification.vue'
	import type { ProjectDto } from './services/api/projects'
	import type { TaskDto } from './services/api/tasks'
	import { useInlineCreateFocusStore } from './stores/inline-create-focus'
	import { useProjectTreeStore } from './stores/project-tree'
	import { useProjectsStore } from './stores/projects'
	import { useSettingsStore } from './stores/settings'
	import { SPACE_DISPLAY, SPACE_IDS } from './config/space'

	import AppShell from './layouts/AppShell.vue'

	const router = useRouter()
	const route = useRoute()
	const routeProjectId = useNullableStringRouteQuery('project')
	const commandPaletteOpen = ref(false)
	const createTaskModalOpen = ref(false)
	const createProjectModalOpen = ref(false)
	const createProjectModalSpaceId = ref<string>('work')

	const settingsStore = useSettingsStore()
	const projectTreeStore = useProjectTreeStore()
	const projectsStore = useProjectsStore()
	const inlineCreateFocusStore = useInlineCreateFocusStore()
	const defaultPageMotionPreset = useMotionPreset('page')
	const projectPageMotionPreset = useProjectMotionPreset('page', 'routePage')
	const commandPaletteModalUi = createModalLayerUi({
		content: 'p-0',
	})

	const currentSpaceId = computed(() => {
		if (!settingsStore.loaded) return 'work'
		return settingsStore.settings.activeSpaceId ?? 'work'
	})

	const currentProjects = computed<ProjectDto[]>(() => {
		return projectsStore.getProjectsOfSpace(currentSpaceId.value)
	})

	const currentRouteProjectId = computed<string | undefined>(() => {
		return routeProjectId.value ?? undefined
	})

	const isProjectContextRoute = computed(() => {
		return route.path.startsWith('/space/') && Boolean(currentRouteProjectId.value)
	})

	const pageMotionPreset = computed(() => {
		if (isProjectContextRoute.value) return projectPageMotionPreset.value
		return defaultPageMotionPreset.value
	})

	// 定义命令组
	const commandGroups = computed(() => [
		{
			id: 'workspace',
			label: '工作空间',
			items: [
				{ label: 'All Tasks', icon: 'i-lucide-list-checks', to: `/space/${currentSpaceId.value}` },
				...SPACE_IDS.map((id) => ({
					label: SPACE_DISPLAY[id].label,
					icon: SPACE_DISPLAY[id].icon,
					to: `/space/${id}`,
				})),
			],
		},
		{
			id: 'review',
			label: '回顾',
			items: [
				{ label: 'Finish List', icon: 'i-lucide-check-circle', to: '/finish-list' },
				{ label: 'Stats', icon: 'i-lucide-bar-chart-3', to: '/stats' },
				{ label: 'Logs', icon: 'i-lucide-scroll-text', to: '/logs' },
			],
		},
		{
			id: 'assets',
			label: '资产库',
			items: [
				{ label: 'Snippets', icon: 'i-lucide-code', to: '/snippets' },
				{ label: 'Vault', icon: 'i-lucide-lock', to: '/vault' },
				{ label: 'Notes', icon: 'i-lucide-notebook', to: '/notes' },
				{ label: 'Toolbox', icon: 'i-lucide-wrench', to: '/toolbox' },
			],
		},
		{
			id: 'settings',
			label: '设置',
			items: [
				{ label: 'About', icon: 'i-lucide-info', to: '/settings/about' },
				{ label: '远端同步', icon: 'i-lucide-cloud', to: '/settings/remote-sync' },
			],
		},
	])

	function onCommandSelect(item: CommandPaletteItem) {
		if (item?.to) {
			router.push(item.to as string)
			commandPaletteOpen.value = false
		}
	}

	function onTaskCreated(task: TaskDto) {
		// 任务创建成功，可以在这里添加后续处理（如刷新列表、显示提示等）
		console.log('任务创建成功:', task)
	}

	function resolveTargetSpaceId(spaceId: string) {
		if ((SPACE_IDS as readonly string[]).includes(spaceId)) {
			return spaceId as (typeof SPACE_IDS)[number]
		}
		return settingsStore.settings.activeSpaceId
	}

	async function onProjectCreated(project: ProjectDto) {
		const targetSpaceId = resolveTargetSpaceId(project.spaceId)
		if (settingsStore.settings.activeSpaceId !== targetSpaceId) {
			await settingsStore.update({ activeSpaceId: targetSpaceId })
		}
		await projectsStore.load(targetSpaceId, { force: true })
		await router.push({
			path: `/space/${targetSpaceId}`,
			query: { project: project.id },
		})
		await projectTreeStore.ensureProjectVisible(
			targetSpaceId,
			project.id,
			projectsStore.getProjectsOfSpace(targetSpaceId),
		)
	}

	// 提供全局的创建项目弹窗控制函数
	function handleOpenCreateProjectModal(spaceId?: string) {
		createProjectModalSpaceId.value = spaceId ?? currentSpaceId.value
		createProjectModalOpen.value = true
	}

	provide('openCreateProjectModal', handleOpenCreateProjectModal)

	// 提供全局的创建任务弹窗控制函数
	function handleOpenCreateTaskModal(_spaceId?: string) {
		// spaceId 参数预留，将来可用于设置默认 space
		createTaskModalOpen.value = true
	}
	provide('openCreateTaskModal', handleOpenCreateTaskModal)

	useAppShortcuts(
		{ routePath: computed(() => route.path) },
		{
			toggleCommandPalette: () => {
				commandPaletteOpen.value = !commandPaletteOpen.value
			},
			openCreateProject: () => {
				handleOpenCreateProjectModal()
			},
			openCreateTask: () => {
				handleOpenCreateTaskModal()
			},
			focusInlineTaskCreator: () => {
				inlineCreateFocusStore.bumpTodoFocus()
			},
		},
	)

	// 暴露给子组件使用
	provide('commandPalette', {
		open: () => {
			commandPaletteOpen.value = true
		},
	})
</script>
