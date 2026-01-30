<template>
	<header class="shrink-0 px-6 sticky top-0 z-40 bg-default/85 backdrop-blur-xl border-b border-default/80">
		<div class="h-16 flex items-center justify-between">
			<!-- 左侧：面包屑 -->
			<div class="flex items-center gap-2 min-w-0 flex-1">
				<RouterLink
					v-if="currentSpaceLabel && currentSpaceIcon && currentSpaceId"
					:to="`/space/${currentSpaceId}`"
					class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
					:class="spacePillClass">
					<UIcon
						:name="currentSpaceIcon"
						class="size-3.5 shrink-0 text-white" />
					<span>{{ currentSpaceLabel }}</span>
				</RouterLink>

				<template v-if="projectTrail.length">
					<template
						v-for="(item, index) in projectTrail"
						:key="`${item.label}-${index}`">
						<UIcon
							name="i-lucide-chevron-right"
							class="size-3.5 text-muted shrink-0" />
						<RouterLink
							v-if="index < projectTrail.length - 1 && item.to"
							:to="item.to"
							class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
							:class="projectPillClass(index)">
							<UIcon
								:name="projectIcon"
								class="size-3.5 shrink-0 text-white" />
							<span class="truncate max-w-[160px]">{{ item.label }}</span>
						</RouterLink>
						<span
							v-else-if="index < projectTrail.length - 1"
							class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
							:class="projectPillClass(index)">
							<UIcon
								:name="projectIcon"
								class="size-3.5 shrink-0 text-white" />
							<span class="truncate max-w-[160px]">{{ item.label }}</span>
						</span>
						<span
							v-else
							class="text-base font-bold text-default truncate max-w-[240px]">
							{{ item.label }}
						</span>
					</template>
				</template>
			</div>

			<!-- 右侧：搜索框胶囊 + 操作按钮 -->
			<div class="flex items-center gap-2 shrink-0">
				<!-- 搜索框（胶囊样式） -->
				<div class="relative shrink-0">
					<UInput
						v-model="searchQuery"
						placeholder="搜索任务..."
						icon="i-lucide-search"
						size="sm"
						:ui="{
							width: 'w-64',
						}"
						class="rounded-full! [&>div]:rounded-full! [&_input]:rounded-full!" />
				</div>

				<!-- Filter/Sort 独立按钮 -->
				<template v-if="isWorkspacePage">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-filter">
						<span class="ml-1 text-[11px]">Filter</span>
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-arrow-up-down">
						<span class="ml-1 text-[11px]">Sort</span>
					</UButton>

					<template v-if="hasEditBridge">
						<button
							type="button"
							class="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-sm transition-all"
							:class="editButtonClass"
							@click="onToggleEditMode">
							<UIcon
								:name="editButtonIcon"
								class="size-3.5"
								:class="editButtonIconClass" />
							<span>{{ editButtonLabel }}</span>
						</button>
					</template>
				</template>
			</div>
		</div>

		<div
			v-if="hasEditBridge && isEditMode"
			class="pointer-events-none absolute inset-x-0 top-full -mt-px">
			<div class="pointer-events-auto mt-0">
				<button
					type="button"
					class="inline-flex h-12 w-full items-center justify-center gap-2 bg-linear-to-b from-error/95 to-error/10 px-5 text-sm font-semibold text-white transition-all hover:from-error/95 hover:to-error/55 disabled:cursor-not-allowed disabled:opacity-60"
					:class="deleteGlowClass"
					:disabled="editSelectedCount === 0"
					@click="onOpenDeleteConfirm">
					<UIcon
						name="i-lucide-trash-2"
						class="size-4" />
					<span>删除</span>
					<span class="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
						{{ editSelectedCount }}
					</span>
				</button>
			</div>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed, inject, ref, type ComputedRef } from 'vue'
	import { useRoute } from 'vue-router'

	import type { ProjectDto } from '@/services/api/projects'
	import { PROJECT_ICON, PROJECT_LEVEL_PILL_CLASSES } from '@/config/project'
	import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY } from '@/config/space'
	import { useProjectsStore } from '@/stores/projects'
	import { useSettingsStore } from '@/stores/settings'
	import { useWorkspaceEditStore } from '@/stores/workspace-edit'

	const route = useRoute()
	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()
	const workspaceEditStore = useWorkspaceEditStore()

	const searchQuery = ref('')
	const projectIcon = PROJECT_ICON

	const isWorkspacePage = computed(() => {
		return route.path.startsWith('/space/') || route.path === '/all-tasks'
	})

	const hasEditBridge = computed(() => isWorkspacePage.value && workspaceEditStore.hasHandlers)
	const isEditMode = computed(() => workspaceEditStore.isEditMode)
	const editSelectedCount = computed(() => workspaceEditStore.selectedCount)
	const editButtonLabel = computed(() => (isEditMode.value ? '取消' : '编辑'))
	const editButtonIcon = computed(() => (isEditMode.value ? 'i-lucide-x' : 'i-lucide-pencil'))
	const editButtonClass = computed(() => {
		if (isEditMode.value) {
			return 'bg-zinc-200 text-default hover:bg-zinc-300'
		}
		return 'bg-error text-white shadow-error/40 hover:bg-error/90'
	})
	const editButtonIconClass = computed(() => (isEditMode.value ? 'text-default' : 'text-white'))
	const deleteGlowClass = computed(() => 'shadow-[0_18px_36px_-20px_rgba(239,68,68,0.85)]')

	function onEnterEditMode() {
		workspaceEditStore.triggerEnterEditMode()
	}

	function onExitEditMode() {
		workspaceEditStore.triggerExitEditMode()
	}

	function onOpenDeleteConfirm() {
		workspaceEditStore.triggerOpenDeleteConfirm()
	}

	function onToggleEditMode() {
		if (isEditMode.value) {
			onExitEditMode()
			return
		}
		onEnterEditMode()
	}

	const currentSpaceId = computed(() => {
		const sid = route.params.spaceId
		if (typeof sid === 'string') return sid
		if (!settingsStore.loaded) return null
		return settingsStore.settings.activeSpaceId ?? 'work'
	})

	const currentSpaceLabel = computed(() => {
		const spaceId = currentSpaceId.value
		if (!spaceId) return null
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.label ?? spaceId
	})

	const currentSpaceIcon = computed(() => {
		const spaceId = currentSpaceId.value
		if (!spaceId) return null
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.icon ?? DEFAULT_SPACE_DISPLAY.icon
	})

	const spacePillClass = computed(() => {
		const spaceId = currentSpaceId.value
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.pillClass ?? DEFAULT_SPACE_DISPLAY.pillClass
	})

	// 从 inject 获取 workspace 页面的 breadcrumbItems
	const workspaceBreadcrumbItems = inject<ComputedRef<{ label: string; to?: string }[]>>(
		'workspaceBreadcrumbItems',
		computed(() => []),
	)

	const breadcrumbItems = computed(() => {
		// 优先使用 inject 的 breadcrumbItems（来自 workspace 页面），但需要过滤掉 Space 相关的项
		if (workspaceBreadcrumbItems.value.length > 0) {
			const spaceLabelSet = new Set(Object.values(SPACE_DISPLAY).map((item) => item.label.toLowerCase()))
			// 过滤掉 'Space' 和 space label（如 'Work'），只保留 project 路径
			return workspaceBreadcrumbItems.value.filter((item) => {
				const label = item.label.toLowerCase()
				return label !== 'space' && !spaceLabelSet.has(label)
			})
		}
		// 如果没有传入，根据路由自动生成（只包含 project，不包含 space）
		if (route.path.startsWith('/space/') || route.path === '/all-tasks') {
			const spaceId = (route.params.spaceId as string) || currentSpaceId.value
			const base: { label: string; to?: string }[] = []
			const pid = route.query.project
			if (typeof pid === 'string' && spaceId) {
				const list = projectsStore.getProjectsOfSpace(spaceId)
				const path = projectPath(list, pid)
				if (path.length) {
					for (let i = 0; i < path.length; i++) {
						const p = path[i]
						const isLast = i === path.length - 1
						base.push({ label: p.name, ...(isLast ? {} : { to: `/space/${spaceId}?project=${p.id}` }) })
					}
					return base
				}
			}
			base.push({ label: 'All Tasks' })
			return base
		}
		return []
	})

	const projectTrail = computed(() => breadcrumbItems.value)

	const levelPalette = PROJECT_LEVEL_PILL_CLASSES

	const projectPillClass = (index: number) => levelPalette[index % levelPalette.length]

	/** 从 project 列表按 parent_id 回溯，得到 root → … → current 的层级路径 */
	function projectPath(list: ProjectDto[], targetId: string): ProjectDto[] {
		const byId = new Map(list.map((p) => [p.id, p]))
		const out: ProjectDto[] = []
		let curr: ProjectDto | undefined = byId.get(targetId)
		while (curr) {
			out.unshift(curr)
			curr = curr.parent_id ? byId.get(curr.parent_id) : undefined
		}
		return out
	}
</script>
