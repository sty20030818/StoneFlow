<template>
	<VueDraggable
		v-model="localProjects"
		:animation="0"
		:disabled="disabled"
		:force-fallback="true"
		:fallback-tolerance="5"
		class="space-y-0.5"
		ghost-class="opacity-50"
		drag-class="shadow-lg"
		:group="groupName"
		filter=".expand-toggle, .project-menu"
		:prevent-on-filter="true"
		@end="onDragEnd">
		<div
			v-for="item in localProjects"
			:key="item.id"
			class="rounded-lg">
			<div
				v-motion="itemRowMotion"
				class="group relative rounded-lg text-[13px] transition-all duration-150 select-none"
				:class="
					isActiveProject(item.id) ? 'bg-elevated text-default' : 'text-muted hover:bg-elevated hover:text-default'
				"
				@contextmenu.prevent="openContextMenu(item)">
				<RouterLink
					:to="`/space/${spaceId}?project=${item.id}`"
					class="flex w-full items-center gap-2 py-1.5 pr-8"
					:style="{ paddingLeft: `${10 + level * 12}px` }"
					@click.stop>
					<UIcon
						:name="item.icon"
						class="size-3.5"
						:class="item.iconClass" />
					<span class="truncate flex-1">{{ item.label }}</span>
				</RouterLink>
				<UPopover
					:mode="'click'"
					:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
					:ui="popoverUi">
					<button
						type="button"
						class="project-menu absolute top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-all duration-150 hover:bg-neutral-300/60 hover:text-default opacity-0 group-hover:opacity-100 outline-none focus:outline-none"
						:class="item.children && item.children.length > 0 ? 'right-7' : 'right-1'"
						@pointerdown.stop.prevent
						@click.stop>
						<UIcon
							name="i-lucide-more-horizontal"
							class="size-3.5" />
					</button>
					<template #content>
						<div class="p-1 min-w-[140px]">
							<button
								type="button"
								class="w-full px-3 py-2 rounded-lg text-left text-sm text-error hover:bg-elevated transition-colors outline-none focus:outline-none"
								@click="openDeleteConfirm(item)">
								删除
							</button>
						</div>
					</template>
				</UPopover>
				<button
					v-if="item.children && item.children.length > 0"
					type="button"
					class="expand-toggle absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-all duration-150 hover:bg-neutral-300/60 hover:text-default"
					:class="isExpanded(item.id) ? 'rotate-90' : ''"
					@pointerdown.stop.prevent
					@click.stop="toggleExpand(item.id)">
					<UIcon
						name="i-lucide-chevron-right"
						class="size-3.5" />
				</button>
			</div>
			<!-- 递归渲染子节点 -->
			<div
				v-if="item.children && item.children.length > 0 && isExpanded(item.id)"
				v-motion="childTreeMotion"
				class="ml-3">
				<DraggableProjectTree
					:projects="item.children"
					:space-id="spaceId"
					:active-project-id="activeProjectId"
					:expanded-keys="expandedKeys"
					:level="level + 1"
					:parent-id="item.id"
					@update:expanded-keys="$emit('update:expandedKeys', $event)"
					@reorder="$emit('reorder', $event)" />
			</div>
		</div>
	</VueDraggable>

	<UModal
		v-model:open="confirmDeleteOpen"
		title="确认删除"
		description="确认是否删除当前项目"
		:ui="deleteModalUi">
		<template #body>
			<p class="text-sm text-muted">将删除项目“{{ deleteTarget?.label }}”，可在回收站恢复。</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="closeDeleteConfirm">
				取消
			</UButton>
			<UButton
				color="error"
				size="sm"
				:loading="deleting"
				:disabled="!deleteTarget"
				@click="confirmDelete">
				确认删除
			</UButton>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import type { SortableEvent } from 'sortablejs'
	import { computed, ref, toRefs, watch } from 'vue'
	import { VueDraggable } from 'vue-draggable-plus'

	import { useMotionPresetWithDelay } from '@/composables/base/motion'
	import { deleteProject, rebalanceProjectRanks, reorderProject } from '@/services/api/projects'
	import { createModalLayerUi, createPopoverLayerUi } from '@/config/ui-layer'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { calculateInsertRank } from '@/utils/rank'
	import { Menu } from '@tauri-apps/api/menu'

	export type ProjectTreeItem = {
		id: string
		parentId: string | null
		label: string
		icon: string
		iconClass: string
		rank: number
		createdAt: number
		children?: ProjectTreeItem[]
	}

	const props = withDefaults(
		defineProps<{
			projects: ProjectTreeItem[]
			spaceId: string
			activeProjectId: string | null
			expandedKeys: string[]
			disabled?: boolean
			level?: number
			/** 当前层级的父节点 ID，用于限制同级拖拽 */
			parentId?: string | null
		}>(),
		{
			level: 0,
			parentId: null,
		},
	)

	// 使用 toRefs 确保解构后的属性在模板中保持响应式
	const { activeProjectId, spaceId, expandedKeys } = toRefs(props)

	// 基于 parentId 生成唯一 group 名称，限制只能同级拖拽
	const groupName = computed(() => `projects-${props.parentId ?? 'root'}`)
	const rowMotionDelay = computed(() => Math.min(10 + props.level * 8, 60))
	const childMotionDelay = computed(() => Math.min(22 + props.level * 10, 96))
	const itemRowMotion = useMotionPresetWithDelay('listItem', rowMotionDelay.value)
	const childTreeMotion = useMotionPresetWithDelay('drawerSection', childMotionDelay.value)

	const emit = defineEmits<{
		'update:expandedKeys': [keys: string[]]
		reorder: [projects: ProjectTreeItem[]]
	}>()

	const toast = useToast()
	const refreshSignals = useRefreshSignalsStore()
	const popoverUi = createPopoverLayerUi()
	const deleteModalUi = createModalLayerUi({
		width: 'sm:max-w-lg',
	})

	// 本地项目列表副本，用于拖拽
	const localProjects = ref<ProjectTreeItem[]>([])
	const confirmDeleteOpen = ref(false)
	const deleting = ref(false)
	const deleteTarget = ref<ProjectTreeItem | null>(null)

	/**
	 * 同步 props 到本地
	 */
	watch(
		() => props.projects,
		(newProjects) => {
			const oldIds = new Set(localProjects.value.map((p) => p.id))
			const newIds = new Set(newProjects.map((p) => p.id))

			// ID 集合相同，说明只是顺序或属性变化
			if (oldIds.size === newIds.size && [...oldIds].every((id) => newIds.has(id))) {
				const newProjectMap = new Map(newProjects.map((p) => [p.id, p]))
				localProjects.value = localProjects.value.map((localProject) => {
					const newProject = newProjectMap.get(localProject.id)
					if (newProject) {
						return { ...newProject, rank: localProject.rank }
					}
					return localProject
				})
				return
			}

			// ID 集合变化，完全重新同步
			localProjects.value = [...newProjects]
		},
		{ immediate: true, deep: true },
	)

	function isActiveProject(projectId: string) {
		return props.activeProjectId === projectId
	}

	function isExpanded(projectId: string) {
		return props.expandedKeys.includes(projectId)
	}

	function toggleExpand(projectId: string) {
		const newKeys = isExpanded(projectId)
			? props.expandedKeys.filter((k) => k !== projectId)
			: [...props.expandedKeys, projectId]
		emit('update:expandedKeys', newKeys)
	}

	async function openContextMenu(item: ProjectTreeItem) {
		try {
			const menu = await Menu.new({
				items: [
					{
						id: 'edit',
						text: '编辑',
						action: () => {},
					},
					{
						id: 'delete',
						text: '删除',
						action: () => {
							openDeleteConfirm(item)
						},
					},
				],
			})
			await menu.popup()
		} catch (error) {
			console.error('打开项目右键菜单失败:', error)
		}
	}

	function openDeleteConfirm(item: ProjectTreeItem) {
		deleteTarget.value = item
		confirmDeleteOpen.value = true
	}

	function closeDeleteConfirm() {
		confirmDeleteOpen.value = false
		deleteTarget.value = null
	}

	async function confirmDelete() {
		if (!deleteTarget.value || deleting.value) return
		deleting.value = true
		try {
			await deleteProject(deleteTarget.value.id)
			refreshSignals.bumpProject()
			toast.add({
				title: '已移入回收站',
				description: deleteTarget.value.label,
				color: 'success',
			})
			closeDeleteConfirm()
		} catch (e) {
			toast.add({
				title: '删除失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			deleting.value = false
		}
	}

	async function onDragEnd(evt: SortableEvent) {
		const oldIndex = evt.oldIndex
		const newIndex = evt.newIndex

		if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

		const projects = localProjects.value
		const movedProject = projects[newIndex]

		const prevRank = newIndex > 0 ? projects[newIndex - 1].rank : null
		const nextRank = newIndex < projects.length - 1 ? projects[newIndex + 1].rank : null

		const { newRank, needsRebalance } = calculateInsertRank(prevRank, nextRank)

		// 更新本地状态
		movedProject.rank = newRank

		// 通知父组件更新状态
		emit('reorder', [...localProjects.value])

		try {
			// 立即更新被拖拽项目的 rank
			await reorderProject(movedProject.id, newRank)

			// 如果需要重排，后台异步执行
			if (needsRebalance) {
				const projectIds = projects.map((p) => p.id)
				rebalanceProjectRanks(projectIds).catch(console.error)
			}
		} catch (error) {
			console.error('Failed to reorder project:', error)
		}
	}
</script>
