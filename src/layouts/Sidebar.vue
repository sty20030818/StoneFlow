<template>
	<aside class="w-72 shrink-0 border-r border-default flex flex-col bg-default/80 backdrop-blur-xl relative h-full">
		<!-- 顶部：Brand + Space Segmented Control -->
		<div class="px-3 pt-3 shrink-0">
			<div class="mb-2">
				<BrandLogo />
			</div>
			<div class="rounded-full bg-elevated/70 border border-default/80 p-1 flex gap-1">
				<button
					v-for="s in spaces"
					:key="s.id"
					type="button"
					class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium cursor-pointer transition-all duration-150 hover:shadow-sm active:translate-y-px"
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
		<div class="px-3 pt-4 shrink-0 pb-1.5">
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
		<div class="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
			<section>
				<div class="space-y-0.5">
					<div
						v-if="projectsTree.length === 0"
						class="text-[12px] text-muted px-2.5 py-1.5 rounded-md bg-elevated/60 border border-dashed border-default/70">
						当前 Space 暂无项目
					</div>
					<DraggableProjectTree
						v-else
						:projects="projectsTree"
						:space-id="spaceValue"
						:active-project-id="activeProjectId"
						:expanded-keys="expandedKeys"
						@update:expanded-keys="expandedKeys = $event" />
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
						v-show="!isLibraryCollapsed"
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
				class="px-3"
				:class="isLibraryCollapsed ? 'pt-0' : 'pt-3'">
				<div class="pt-1.5">
					<UserCard />
				</div>
			</div>
			<!-- Sync Controls -->
			<div class="px-3 pb-3 pt-2">
				<div class="grid grid-cols-2 gap-2">
					<UButton
						block
						size="xs"
						color="neutral"
						variant="soft"
						icon="i-lucide-cloud-upload"
						label="上传"
						:loading="isPushing"
						:disabled="isPulling || !hasActiveProfile"
						@click="handlePush" />
					<UButton
						block
						size="xs"
						color="neutral"
						variant="soft"
						icon="i-lucide-cloud-download"
						label="下载"
						:loading="isPulling"
						:disabled="isPushing || !hasActiveProfile"
						@click="handlePull" />
				</div>
				<div class="mt-1.5 flex justify-between text-[10px] text-muted">
					<span>{{ lastPushedText }}</span>
					<span>{{ lastPulledText }}</span>
				</div>
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref, watch } from 'vue'
	import { useRoute } from 'vue-router'

	import { inject } from 'vue'

	import BrandLogo from '@/components/BrandLogo.vue'
	import DraggableProjectTree, { type ProjectTreeItem } from '@/components/DraggableProjectTree.vue'
	import UserCard from '@/components/UserCard.vue'
	import { PROJECT_ICON, PROJECT_LEVEL_TEXT_CLASSES } from '@/config/project'
	import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
	import { getDefaultProject } from '@/services/api/projects'
	import type { ProjectDto } from '@/services/api/projects'
import { useProjectTreeStore } from '@/stores/project-tree'
import { useProjectsStore } from '@/stores/projects'
import { useRemoteSyncStore } from '@/stores/remote-sync'
import { useRefreshSignalsStore } from '@/stores/refresh-signals'
import { useViewStateStore } from '@/stores/view-state'

import { tauriInvoke } from '@/services/tauri/invoke'
	import { formatDistanceToNow } from 'date-fns'
	import { zhCN } from 'date-fns/locale'
	const props = defineProps<{
		space?: string | null
	}>()

	const emit = defineEmits<{
		'update:space': [spaceId: string]
	}>()

	const route = useRoute()
	const currentPath = computed(() => route.path)

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
const remoteSyncStore = useRemoteSyncStore()
const refreshSignals = useRefreshSignalsStore()

	const defaultProject = ref<ProjectDto | null>(null)

	// 通过 inject 获取全局的创建项目弹窗控制函数
	const openCreateProjectModal = inject<(spaceId?: string) => void>('openCreateProjectModal')

	const currentProjects = computed(() => projectsStore.getProjectsOfSpace(spaceValue.value))

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

	const projectTreeStore = useProjectTreeStore()

	const expandedKeys = computed<string[]>({
		get: () => projectTreeStore.getExpanded(spaceValue.value),
		set: (val) => {
			projectTreeStore.setExpanded(spaceValue.value, val)
		},
	})

	const activeProjectId = computed(() => (typeof route.query.project === 'string' ? route.query.project : null))

	function isActiveProject(projectId: string) {
		return currentPath.value === `/space/${spaceValue.value}` && activeProjectId.value === projectId
	}

	function getAncestorIds(projectId: string, list: ProjectDto[]) {
		const byId = new Map(list.map((p) => [p.id, p]))
		const ancestors: string[] = []
		let curr = byId.get(projectId)
		while (curr?.parentId) {
			ancestors.unshift(curr.parentId)
			curr = byId.get(curr.parentId)
		}
		return ancestors
	}

	function ensureAncestorsExpanded() {
		if (currentPath.value !== `/space/${spaceValue.value}`) return
		if (!activeProjectId.value) return
		const list = currentProjects.value
		if (!list.length) return
		const ancestors = getAncestorIds(activeProjectId.value, list)
		if (!ancestors.length) return
		const next = Array.from(new Set([...expandedKeys.value, ...ancestors]))
		if (next.length !== expandedKeys.value.length) {
			expandedKeys.value = next
		}
	}

	async function loadDefaultProject() {
		try {
			const project = await getDefaultProject(spaceValue.value)
			defaultProject.value = project
		} catch (error) {
			console.error('加载默认项目失败:', error)
		}
	}

	async function loadProjects(force = false) {
		if (force) {
			await projectsStore.loadForSpace(spaceValue.value, true)
		} else {
			await projectsStore.ensureLoaded(spaceValue.value)
		}
		await loadDefaultProject()
	}

	function handleOpenCreateProjectModal() {
		if (openCreateProjectModal) {
			openCreateProjectModal(spaceValue.value)
		}
	}

	watch(spaceValue, () => {
		loadProjects()
	})

	// 监听项目刷新信号，强制刷新当前 Space 的项目树与默认项目
	watch(
		() => refreshSignals.projectTick,
		() => {
			loadProjects(true)
		},
	)

	watch(
		() => [activeProjectId.value, currentProjects.value, currentPath.value],
		() => {
			ensureAncestorsExpanded()
		},
		{ immediate: true },
	)

	// --- Neon 同步逻辑 ---
	const isPushing = ref(false)
	const isPulling = ref(false)
	const lastPushedAt = ref<number | null>(null)
	const lastPulledAt = ref<number | null>(null)

	const lastPushedText = computed(() => {
		if (!lastPushedAt.value) return '未上传'
		return '↑ ' + formatDistanceToNow(lastPushedAt.value, { addSuffix: true, locale: zhCN })
	})

	const lastPulledText = computed(() => {
		if (!lastPulledAt.value) return '未下载'
		return '↓ ' + formatDistanceToNow(lastPulledAt.value, { addSuffix: true, locale: zhCN })
	})

	const hasActiveProfile = computed(() => !!remoteSyncStore.activeProfileId)

	async function resolveActiveDatabaseUrl() {
		if (!remoteSyncStore.loaded) await remoteSyncStore.load()
		const profile = remoteSyncStore.activeProfile
		if (!profile) {
			console.error('未配置远端数据库')
			return null
		}
		const url = await remoteSyncStore.getProfileUrl(profile.id)
		if (!url) {
			console.error('未找到数据库地址')
			return null
		}
		return url
	}

	async function handlePush() {
		if (isPushing.value || isPulling.value) return
		try {
			const databaseUrl = await resolveActiveDatabaseUrl()
			if (!databaseUrl) return
			isPushing.value = true
			const ts = await tauriInvoke<number>('push_to_neon', { args: { databaseUrl } })
			lastPushedAt.value = ts
			localStorage.setItem('neon_last_pushed_at', String(ts))
		} catch (error) {
			console.error('上传失败:', error)
		} finally {
			isPushing.value = false
		}
	}

	async function handlePull() {
		if (isPushing.value || isPulling.value) return
		try {
			const databaseUrl = await resolveActiveDatabaseUrl()
			if (!databaseUrl) return
			isPulling.value = true
			const ts = await tauriInvoke<number>('pull_from_neon', { args: { databaseUrl } })
			lastPulledAt.value = ts
			localStorage.setItem('neon_last_pulled_at', String(ts))
			loadProjects(true)
		} catch (error) {
			console.error('下载失败:', error)
		} finally {
			isPulling.value = false
		}
	}

	onMounted(() => {
		projectTreeStore.load()
		viewStateStore.load()
		remoteSyncStore.load()
		loadProjects()

		// 恢复上次同步时间
		const savedPush = localStorage.getItem('neon_last_pushed_at')
		if (savedPush) {
			const ts = parseInt(savedPush, 10)
			if (!isNaN(ts)) lastPushedAt.value = ts
		}
		const savedPull = localStorage.getItem('neon_last_pulled_at')
		if (savedPull) {
			const ts = parseInt(savedPull, 10)
			if (!isNaN(ts)) lastPulledAt.value = ts
		}
	})
</script>
