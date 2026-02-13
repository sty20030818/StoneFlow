<template>
	<aside
		v-motion="sidebarShellMotion"
		class="w-72 shrink-0 border-r border-default flex flex-col bg-default/80 backdrop-blur-xl relative z-layer-sidebar h-full">
		<!-- 顶部：Brand + Space Segmented Control -->
		<div class="px-3 pt-3 shrink-0">
			<div class="mb-2">
				<BrandLogo />
			</div>
			<div
				v-motion="spaceSegmentMotion"
				class="rounded-full bg-elevated/70 border border-default/80 p-1 flex gap-1">
				<button
					v-for="s in spaces"
					:key="s.id"
					type="button"
					v-motion="spaceSwitchButtonMotion"
					class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer hover:shadow-sm active:translate-y-px"
					:class="
						spaceValue === s.id
							? 'bg-default text-default shadow-sm'
							: 'text-muted hover:text-default hover:bg-default/40'
					"
					@click="onSpaceClick(s.id)">
					<UIcon
						:name="s.icon"
						class="size-3.5"
						:class="spaceValue === s.id ? s.activeIconClass : s.iconClass" />
					<span>{{ s.label }}</span>
				</button>
			</div>
		</div>

		<!-- 固定区域：Execution Zone -->
		<div class="px-3 pt-4 shrink-0">
			<section>
				<div class="px-1.5 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Execution</div>
				<nav class="flex flex-col gap-0.5">
					<RouterLink
						:to="allTasksPath"
						class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
						:class="isAllTasksActive ? 'bg-elevated text-default' : ''">
						<UIcon
							name="i-lucide-list-checks"
							class="text-pink-500" />
						<span>All Tasks</span>
					</RouterLink>
					<!-- 默认 Project 入口 -->
					<RouterLink
						v-if="defaultProject"
						:to="`/space/${spaceValue}?project=${defaultProject.id}`"
						class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
						:class="isActiveProject(defaultProject.id) ? 'bg-elevated text-default' : ''">
						<UIcon
							:name="projectIcon"
							class="size-3.5"
							:class="defaultProjectIconClass" />
						<span class="truncate">{{ defaultProject.title }}</span>
					</RouterLink>
					<!-- Trash 入口 -->
					<RouterLink
						to="/trash"
						class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
						:class="currentPath === '/trash' ? 'bg-elevated text-default' : ''">
						<UIcon
							name="i-lucide-trash-2"
							class="text-red-500" />
						<span>Trash</span>
					</RouterLink>
				</nav>
			</section>
		</div>

		<!-- 固定区域：Projects Header -->
		<div
			v-motion="projectHeaderMotion"
			class="px-3 pt-4 shrink-0 pb-1.5">
			<div class="flex items-center justify-between px-1.5">
				<div class="text-[11px] font-medium text-muted uppercase tracking-wide">Projects</div>
				<UButton
					color="neutral"
					variant="ghost"
					icon="i-lucide-plus"
					size="xs"
					:ui="{
						rounded: 'rounded-lg',
					}"
					@click="handleOpenCreateProjectModal" />
			</div>
		</div>

		<!-- 滚动区域：Project Tree -->
		<div
			class="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
			<section>
				<div class="space-y-0.5">
					<div
						v-if="displayProjectsTree.length > 0"
						class="space-y-0.5">
						<DraggableProjectTree
							:projects="displayProjectsTree"
							:space-id="spaceValue"
							:active-project-id="activeProjectId"
							:expanded-keys="expandedKeys"
							@update:expanded-keys="expandedKeys = $event" />
					</div>
					<div
						v-else-if="showProjectsEmpty"
						class="text-[12px] text-muted px-2.5 py-1.5 rounded-md bg-elevated/60 border border-dashed border-default/70">
						当前 Space 暂无项目
					</div>
				</div>
			</section>
		</div>

		<!-- 底部：Library + User Capsule -->
		<div class="shrink-0 border-t border-default/80 bg-default/80">
			<!-- Library：Collapsible -->
			<div class="px-3">
				<section
					class="transition-all duration-200 ease-in-out"
					:class="isLibraryCollapsed ? 'py-2' : 'pt-3'">
					<div
						class="flex items-center justify-between px-1.5 cursor-pointer group select-none"
						@click="isLibraryCollapsed = !isLibraryCollapsed">
						<div
							class="text-[11px] font-medium text-muted uppercase tracking-wide"
							:class="{ 'opacity-70': isLibraryCollapsed }">
							Library
						</div>
						<UIcon
							name="i-lucide-chevron-down"
							class="size-3.5 text-muted transition-transform duration-200 opacity-0 group-hover:opacity-100"
							:class="isLibraryCollapsed ? '-rotate-90' : ''" />
					</div>

					<nav
						v-if="!isLibraryCollapsed"
						v-motion="libraryNavMotion"
						class="flex flex-col gap-0.5 mt-1.5">
						<RouterLink
							v-for="item in libraryNav"
							:key="item.to"
							:to="item.to"
							class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
							:class="currentPath === item.to ? 'bg-elevated text-default' : ''">
							<UIcon
								:name="item.icon"
								:class="item.iconColor" />
							<span>{{ item.label }}</span>
						</RouterLink>
					</nav>
				</section>
			</div>

			<!-- User Capsule -->
			<div
				class="p-3"
				:class="isLibraryCollapsed ? 'pt-0' : 'pt-3'">
				<div
					v-motion="userCardMotion"
					class="pt-1.5">
					<UserCard />
				</div>
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
	import { watchDebounced, watchPausable, watchThrottled } from '@vueuse/core'
	import { computed, inject, onMounted, ref, watch } from 'vue'
	import { useRoute } from 'vue-router'

	import { useProjectMotionPreset } from '@/composables/base/motion'
	import { useNullableStringRouteQuery } from '@/composables/base/route-query'
	import { useRuntimeGate } from '@/composables/base/runtime-gate'
	import BrandLogo from '@/components/BrandLogo.vue'
	import DraggableProjectTree, { type ProjectTreeItem } from '@/components/DraggableProjectTree.vue'
	import UserCard from '@/components/UserCard.vue'
	import { PROJECT_ICON, PROJECT_LEVEL_TEXT_CLASSES } from '@/config/project'
	import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
	import { useProjectTreeStore } from '@/stores/project-tree'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useViewStateStore } from '@/stores/view-state'
	const props = defineProps<{
		space?: string | null
	}>()

	const emit = defineEmits<{
		'update:space': [spaceId: string]
	}>()

	const route = useRoute()
	const routeProjectId = useNullableStringRouteQuery('project')
	const currentPath = computed(() => route.path)
	const sidebarShellMotion = useProjectMotionPreset('drawerSection', 'sidebarShell')
	const spaceSegmentMotion = useProjectMotionPreset('drawerSection', 'sidebarSpaceSegment')
	const spaceSwitchButtonMotion = useProjectMotionPreset('statusFeedback', 'stateAction')
	const projectHeaderMotion = useProjectMotionPreset('drawerSection', 'sidebarProjectHeader')
	const libraryNavMotion = useProjectMotionPreset('drawerSection', 'sidebarLibrary')
	const userCardMotion = useProjectMotionPreset('drawerSection', 'sidebarUser')

	const spaceValue = computed(() => props.space ?? 'work')
	const projectIcon = PROJECT_ICON
	const projectLevelColors = PROJECT_LEVEL_TEXT_CLASSES
	const defaultProjectIconClass = projectLevelColors[0]

	const viewStateStore = useViewStateStore()
	const isLibraryCollapsed = computed({
		get: () => viewStateStore.libraryCollapsed,
		set: (val) => viewStateStore.setLibraryCollapsed(val),
	})

	const spaces = SPACE_IDS.map((id) => ({
		id,
		label: SPACE_DISPLAY[id].label,
		icon: SPACE_DISPLAY[id].icon,
		iconClass: SPACE_DISPLAY[id].iconMutedClass,
		activeIconClass: SPACE_DISPLAY[id].iconClass,
	}))

	function onSpaceClick(id: string) {
		if (id === spaceValue.value) return
		emit('update:space', id)
	}

	const allTasksPath = computed(() => `/space/${spaceValue.value}`)
	const isAllTasksActive = computed(() => {
		if (route.path === '/all-tasks') return true
		return currentPath.value === `/space/${spaceValue.value}` && !route.query.project
	})

	const libraryNav = [
		{ to: '/finish-list', label: 'Finish List', icon: 'i-lucide-check-circle', iconColor: 'text-green-500' },
		{ to: '/stats', label: 'Stats', icon: 'i-lucide-bar-chart-3', iconColor: 'text-blue-500' },
		{ to: '/logs', label: 'Logs', icon: 'i-lucide-scroll-text', iconColor: 'text-orange-500' },
		{ to: '/snippets', label: 'Snippets', icon: 'i-lucide-code', iconColor: 'text-cyan-500' },
		{ to: '/vault', label: 'Vault', icon: 'i-lucide-lock', iconColor: 'text-yellow-500' },
		{ to: '/notes', label: 'Notes', icon: 'i-lucide-notebook', iconColor: 'text-pink-500' },
		{ to: '/diary', label: 'Diary', icon: 'i-lucide-book-open-text', iconColor: 'text-indigo-500' },
	]

	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()
	const { canBackgroundRefresh } = useRuntimeGate()

	// 通过 inject 获取全局的创建项目弹窗控制函数
	const openCreateProjectModal = inject<(spaceId?: string) => void>('openCreateProjectModal')

	const currentProjects = computed(() => projectsStore.getProjectsOfSpace(spaceValue.value))
	const defaultProject = computed(() => currentProjects.value.find((p) => p.id.endsWith('_default')) ?? null)
	const isProjectsLoaded = computed(() => projectsStore.isSpaceLoaded(spaceValue.value))
	const isProjectsLoading = computed(() => projectsStore.isSpaceLoading(spaceValue.value))

	/**
	 * 构建项目树（用于嵌套拖拽）
	 */
	const projectsTree = computed<ProjectTreeItem[]>(() => {
		const list = currentProjects.value
		if (!list.length) return []

		const levelColors = projectLevelColors

		// 过滤掉默认项目（ID 以 _default 结尾）
		const filtered = list.filter((p) => !p.id.endsWith('_default'))

		// 按 parentId 分组
		const byParent = new Map<string | null, typeof filtered>()
		for (const p of filtered) {
			const key = p.parentId
			const bucket = byParent.get(key) ?? []
			bucket.push(p)
			byParent.set(key, bucket)
		}

		// 递归构建树
		function buildTree(parentId: string | null, depth: number): ProjectTreeItem[] {
			const children = byParent.get(parentId) ?? []
			// 按 rank ASC -> createdAt ASC 排序
			children.sort((a, b) => {
				if (a.rank !== b.rank) return a.rank - b.rank
				return a.createdAt - b.createdAt
			})
			return children.map((p) => {
				const childItems = buildTree(p.id, depth + 1)
				return {
					id: p.id,
					parentId: p.parentId,
					label: p.title,
					icon: PROJECT_ICON,
					iconClass: levelColors[depth % levelColors.length],
					rank: p.rank,
					createdAt: p.createdAt,
					children: childItems.length > 0 ? childItems : undefined,
				}
			})
		}

		return buildTree(null, 0)
	})

	const projectsTreeCacheBySpace = ref<Record<string, ProjectTreeItem[]>>({})

	// 缓存最近一次非空项目树，避免刷新时在“项目树/占位文案”之间来回切换造成闪动
	watchThrottled(
		() => [spaceValue.value, projectsTree.value] as const,
		([spaceId, tree]) => {
			if (tree.length === 0) return
			projectsTreeCacheBySpace.value = {
				...projectsTreeCacheBySpace.value,
				[spaceId]: tree,
			}
		},
		{
			immediate: true,
			throttle: 120,
			leading: true,
			trailing: true,
		},
	)

	const cachedProjectsTree = computed<ProjectTreeItem[]>(() => projectsTreeCacheBySpace.value[spaceValue.value] ?? [])
	const displayProjectsTree = computed<ProjectTreeItem[]>(() => {
		if (projectsTree.value.length > 0) return projectsTree.value
		if (isProjectsLoading.value && cachedProjectsTree.value.length > 0) return cachedProjectsTree.value
		return projectsTree.value
	})
	const showProjectsEmpty = computed(
		() => displayProjectsTree.value.length === 0 && isProjectsLoaded.value && !isProjectsLoading.value,
	)

	const projectTreeStore = useProjectTreeStore()

	const expandedKeys = computed<string[]>({
		get: () => projectTreeStore.getExpanded(spaceValue.value),
		set: (val) => {
			projectTreeStore.setExpanded(spaceValue.value, val)
		},
	})

	const activeProjectId = computed(() => routeProjectId.value)

	function isActiveProject(projectId: string) {
		return currentPath.value === `/space/${spaceValue.value}` && activeProjectId.value === projectId
	}

	const routeProjectTarget = computed(() => {
		if (currentPath.value !== `/space/${spaceValue.value}`) return null
		if (!activeProjectId.value) return null
		return {
			spaceId: spaceValue.value,
			projectId: activeProjectId.value,
		}
	})

	async function loadProjects(force = false) {
		if (force) {
			await projectsStore.load(spaceValue.value, { force: true })
		} else {
			await projectsStore.ensureLoaded(spaceValue.value)
		}
	}

	function handleOpenCreateProjectModal() {
		if (openCreateProjectModal) {
			openCreateProjectModal(spaceValue.value)
		}
	}

	watchDebounced(
		spaceValue,
		() => {
			void loadProjects()
		},
		{ debounce: 80, maxWait: 240 },
	)

	// 路由驱动祖先展开：目标变化即应用；树延迟加载后会基于同一目标补偿应用。
	watchDebounced(
		() =>
			[
				routeProjectTarget.value?.spaceId ?? null,
				routeProjectTarget.value?.projectId ?? null,
				currentProjects.value.length,
			] as const,
		([spaceId, projectId]) => {
			if (!spaceId || !projectId) return
			if (!projectTreeStore.hasMissingAncestorsInExpanded(spaceId, projectId, currentProjects.value)) return
			void projectTreeStore.ensureProjectVisible(spaceId, projectId, currentProjects.value)
		},
		{
			immediate: true,
			debounce: 40,
			maxWait: 160,
		},
	)

	// 项目刷新信号使用可暂停监听，窗口不可见或离线时不触发后台刷新。
	const { pause: pauseProjectRefreshWatch, resume: resumeProjectRefreshWatch } = watchPausable(
		() => refreshSignals.projectTick,
		() => {
			if (!canBackgroundRefresh.value) return
			void loadProjects(true)
		},
	)

	watch(
		canBackgroundRefresh,
		(canRefresh) => {
			if (canRefresh) {
				resumeProjectRefreshWatch()
				return
			}
			pauseProjectRefreshWatch()
		},
		{ immediate: true },
	)

	onMounted(() => {
		void loadProjects()
	})
</script>
