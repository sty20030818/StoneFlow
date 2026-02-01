<template>
	<aside class="w-72 shrink-0 border-r border-default flex flex-col bg-default/80 backdrop-blur-xl relative">
		<!-- 顶部：Brand + Space Segmented Control -->
		<div class="px-3 pt-3">
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

		<!-- 中间滚动区：Execution Zone + Projects -->
		<div class="flex-1 overflow-y-auto px-3 py-3 space-y-4">
			<!-- Execution Zone -->
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
						<span class="truncate">{{ defaultProject.name }}</span>
					</RouterLink>
				</nav>
			</section>

			<!-- Project Tree -->
			<section>
				<div class="flex items-center justify-between px-1.5 mb-1.5">
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
				<div class="space-y-0.5">
					<div
						v-if="projectsTree.length === 0"
						class="text-[12px] text-muted px-2.5 py-1.5 rounded-md bg-elevated/60 border border-dashed border-default/70">
						当前 Space 暂无项目
					</div>
					<UTree
						v-else
						v-model:expanded="expandedKeys"
						:nested="false"
						:items="projectsTree"
						:get-key="(item) => item.id"
						:on-toggle="preventTreeToggle"
						:ui="{
							root: 'space-y-0.5',
							item: 'p-0',
							itemWithChildren: 'p-0',
							link: 'p-0',
							listWithChildren: 'mt-0',
						}">
						<template #item-wrapper="{ item, level, expanded, handleToggle }">
							<div
								class="group relative rounded-lg text-[13px] transition-all duration-150"
								:class="
									isActiveProject(item.id)
										? 'bg-elevated text-default'
										: 'text-muted hover:bg-elevated hover:text-default'
								">
								<RouterLink
									:to="`/space/${spaceValue}?project=${item.id}`"
									class="flex w-full items-center gap-2.5 py-1.5 pr-8"
									:style="{ paddingLeft: `${10 + (level - 1) * 12}px` }"
									@click.stop>
									<UIcon
										:name="item.icon"
										class="size-3.5"
										:class="item.iconClass" />
									<span class="truncate">{{ item.label }}</span>
								</RouterLink>
								<button
									v-if="item.children?.length"
									type="button"
									class="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-all duration-150 hover:text-default"
									:class="expanded ? 'rotate-90' : ''"
									@click.stop="handleToggle">
									<UIcon
										name="i-lucide-chevron-right"
										class="size-3.5" />
								</button>
							</div>
						</template>
					</UTree>
				</div>
			</section>
		</div>

		<!-- 底部：Library + User Capsule -->
		<div class="shrink-0 border-t border-default/80 bg-default/80">
			<!-- Library：Finish List + Snippets + Vault + Notes + Stats + Logs -->
			<div class="px-3 pt-3">
				<section>
					<div class="px-1.5 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Library</div>
					<nav class="flex flex-col gap-0.5">
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
			<div class="p-3 pt-3">
				<div class="pt-1.5">
					<UserCard />
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
	import UserCard from '@/components/UserCard.vue'
	import { PROJECT_ICON, PROJECT_LEVEL_TEXT_CLASSES } from '@/config/project'
	import { SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
	import { getDefaultProject } from '@/services/api/projects'
	import type { ProjectDto } from '@/services/api/projects'
	import { useProjectTreeStore } from '@/stores/project-tree'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'

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

	const defaultProject = ref<ProjectDto | null>(null)

	// 通过 inject 获取全局的创建项目弹窗控制函数
	const openCreateProjectModal = inject<(spaceId?: string) => void>('openCreateProjectModal')

	type ProjectTreeItem = {
		id: string
		label: string
		icon: string
		iconClass: string
		children?: ProjectTreeItem[]
	}

	const currentProjects = computed(() => projectsStore.getProjectsOfSpace(spaceValue.value))

	const projectsTree = computed<ProjectTreeItem[]>(() => {
		const list = currentProjects.value
		if (!list.length) return []

		const levelColors = projectLevelColors

		// 过滤掉默认项目（ID 以 _default 结尾）
		const filtered = list.filter((p) => !p.id.endsWith('_default'))

		const byParent = new Map<string | null, typeof filtered>()
		for (const p of filtered) {
			const key = p.parentId
			const bucket = byParent.get(key) ?? []
			bucket.push(p)
			byParent.set(key, bucket)
		}

		function build(parentId: string | null, depth: number): ProjectTreeItem[] {
			const children = byParent.get(parentId) ?? []
			return children.map((p) => {
				const next = build(p.id, depth + 1)
				return {
					id: p.id,
					label: p.name,
					icon: PROJECT_ICON,
					iconClass: levelColors[depth % levelColors.length],
					children: next.length ? next : undefined,
				}
			})
		}

		return build(null, 0)
	})

	const projectTreeStore = useProjectTreeStore()

	const expandedKeys = computed<string[]>({
		get: () => projectTreeStore.getExpanded(spaceValue.value),
		set: (val) => {
			projectTreeStore.setExpanded(spaceValue.value, val)
		},
	})

	const activeProjectId = computed(() => (typeof route.query.project === 'string' ? route.query.project : null))

	function preventTreeToggle(event: CustomEvent<{ originalEvent?: Event }>) {
		if (event.detail?.originalEvent?.type === 'click') {
			event.preventDefault()
		}
	}

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

	onMounted(() => {
		projectTreeStore.load()
		loadProjects()
	})
</script>
