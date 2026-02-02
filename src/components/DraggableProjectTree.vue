<template>
	<VueDraggable
		v-model="localProjects"
		:animation="150"
		:disabled="disabled"
		:force-fallback="true"
		:fallback-tolerance="5"
		class="space-y-0.5"
		ghost-class="opacity-50"
		drag-class="shadow-lg"
		:group="groupName"
		filter=".expand-toggle"
		:prevent-on-filter="true"
		@end="onDragEnd">
		<div
			v-for="item in localProjects"
			:key="item.id"
			class="rounded-lg">
			<div
				class="group relative rounded-lg text-[13px] transition-all duration-150 select-none"
				:class="
					isActiveProject(item.id) ? 'bg-elevated text-default' : 'text-muted hover:bg-elevated hover:text-default'
				">
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
				<button
					v-if="item.children && item.children.length > 0"
					type="button"
					class="expand-toggle absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted transition-all duration-150 hover:bg-neutral-300/60 hover:text-default"
					:class="isExpanded(item.id) ? 'rotate-90' : ''"
					@click.stop="toggleExpand(item.id)">
					<UIcon
						name="i-lucide-chevron-right"
						class="size-3.5" />
				</button>
			</div>
			<!-- 递归渲染子节点 -->
			<div
				v-if="item.children && item.children.length > 0 && isExpanded(item.id)"
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
</template>

<script setup lang="ts">
	import type { SortableEvent } from 'sortablejs'
	import { computed, ref, toRefs, watch } from 'vue'
	import { VueDraggable } from 'vue-draggable-plus'

	import { rebalanceProjectRanks, reorderProject } from '@/services/api/projects'
	import { calculateInsertRank } from '@/utils/rank'

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

	const emit = defineEmits<{
		'update:expandedKeys': [keys: string[]]
		reorder: [projects: ProjectTreeItem[]]
	}>()

	// 本地项目列表副本，用于拖拽
	const localProjects = ref<ProjectTreeItem[]>([])

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
