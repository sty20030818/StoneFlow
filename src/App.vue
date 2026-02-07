<template>
	<!--
    Nuxt UI v4（Vue 项目）建议用 UApp 包裹根节点，
    否则 toast / tooltip / modal 等全局能力可能不可用。
  -->
	<UApp :toaster="{ position: 'bottom-right', duration: 3000, max: 5 }">
		<AppShell>
			<RouterView />
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
	import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
	import { useRoute, useRouter } from 'vue-router'

	import type { CommandPaletteItem } from '@nuxt/ui'

	import CreateProjectModal from '@/components/CreateProjectModal'
	import CreateTaskModal from '@/components/CreateTaskModal'
	import { createModalLayerUi } from '@/config/ui-layer'
	import UpdateNotification from './components/UpdateNotification.vue'
	import type { ProjectDto } from './services/api/projects'
	import type { TaskDto } from './services/api/tasks'
	import { useInlineCreateFocusStore } from './stores/inline-create-focus'
	import { useProjectsStore } from './stores/projects'
	import { useSettingsStore } from './stores/settings'
	import { SPACE_DISPLAY, SPACE_IDS } from './config/space'

	import AppShell from './layouts/AppShell.vue'

	const router = useRouter()
	const route = useRoute()
	const commandPaletteOpen = ref(false)
	const createTaskModalOpen = ref(false)
	const createProjectModalOpen = ref(false)
	const createProjectModalSpaceId = ref<string>('work')

	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()
	const inlineCreateFocusStore = useInlineCreateFocusStore()
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
		const pid = route.query.project
		return typeof pid === 'string' ? pid : undefined
	})

	// 定义命令组
	const commandGroups = computed(() => [
		{
			id: 'workspace',
			label: 'Workspace',
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
			label: 'Review',
			items: [
				{ label: 'Finish List', icon: 'i-lucide-check-circle', to: '/finish-list' },
				{ label: 'Stats', icon: 'i-lucide-bar-chart-3', to: '/stats' },
				{ label: 'Logs', icon: 'i-lucide-scroll-text', to: '/logs' },
			],
		},
		{
			id: 'assets',
			label: 'Assets Library',
			items: [
				{ label: 'Snippets', icon: 'i-lucide-code', to: '/snippets' },
				{ label: 'Vault', icon: 'i-lucide-lock', to: '/vault' },
				{ label: 'Notes', icon: 'i-lucide-notebook', to: '/notes' },
				{ label: 'Toolbox', icon: 'i-lucide-wrench', to: '/toolbox' },
			],
		},
		{
			id: 'settings',
			label: 'Settings',
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

	function isEditableTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLInputElement ||
			target instanceof HTMLTextAreaElement ||
			(target as HTMLElement | null)?.isContentEditable
		)
	}

	function isInteractiveTarget(target: EventTarget | null) {
		if (!(target instanceof HTMLElement)) return false
		const tag = target.tagName
		return tag === 'BUTTON' || tag === 'A' || tag === 'SELECT' || target.getAttribute('role') === 'button'
	}

	// 监听快捷键
	function handleKeydown(e: KeyboardEvent) {
		// ⌘K / Ctrl+K: 打开命令面板
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault()
			commandPaletteOpen.value = !commandPaletteOpen.value
			return
		}

		if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
			if (isEditableTarget(e.target)) return
			e.preventDefault()
			createTaskModalOpen.value = true
			return
		}

		if (e.key === 'Enter') {
			if (isEditableTarget(e.target) || isInteractiveTarget(e.target)) return
			const isWorkspaceRoute = route.path === '/all-tasks' || route.path.startsWith('/space/')
			if (isWorkspaceRoute) {
				e.preventDefault()
				inlineCreateFocusStore.bumpTodoFocus()
			}
		}
	}

	function onTaskCreated(task: TaskDto) {
		// 任务创建成功，可以在这里添加后续处理（如刷新列表、显示提示等）
		console.log('任务创建成功:', task)
	}

	async function onProjectCreated(project: ProjectDto) {
		// 项目创建成功，强制刷新项目列表
		await projectsStore.load(project.spaceId, { force: true })
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

	onMounted(() => {
		window.addEventListener('keydown', handleKeydown)
	})

	onUnmounted(() => {
		window.removeEventListener('keydown', handleKeydown)
	})

	// 暴露给子组件使用
	provide('commandPalette', {
		open: () => {
			commandPaletteOpen.value = true
		},
	})
</script>
