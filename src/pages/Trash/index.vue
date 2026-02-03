<template>
	<div class="space-y-6">
		<Teleport to="#header-actions-portal">
			<div class="rounded-full bg-elevated/70 border border-default/80 p-1 flex gap-1">
				<button
					v-for="opt in viewOptions"
					:key="opt.value"
					type="button"
					class="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:shadow-sm active:translate-y-px"
					:class="viewMode === opt.value ? opt.activeClass : 'text-muted hover:text-default hover:bg-default/40'"
					@click="viewMode = opt.value">
					<UIcon
						:name="opt.icon"
						class="size-3.5"
						:class="viewMode === opt.value ? opt.iconClass : 'text-muted'" />
					<span>{{ opt.label }}</span>
				</button>
			</div>
		</Teleport>

		<div
			v-if="loading"
			class="text-sm text-muted">
			加载中...
		</div>

		<div v-else>
			<div v-if="viewMode === 'projects'">
				<div
					v-if="deletedProjects.length === 0"
					class="text-[12px] text-muted px-3 py-2 rounded-md bg-elevated/60 border border-dashed border-default/70">
					暂无已删除项目
				</div>
				<div
					v-else
					class="space-y-2">
					<div
						v-for="project in deletedProjects"
						:key="project.id"
						class="flex items-center justify-between gap-4 rounded-xl border border-default/70 bg-default/70 px-4 py-3">
						<div class="min-w-0 space-y-0.5">
							<div class="text-sm font-semibold text-default truncate">{{ project.title }}</div>
							<div class="text-xs text-muted truncate">{{ project.path }}</div>
						</div>
						<div class="flex items-center gap-3">
							<TimeDisplay
								:timestamp="project.deletedAt"
								text-class="text-muted" />
							<UButton
								color="neutral"
								variant="soft"
								size="xs"
								:loading="restoringProjectIds.has(project.id)"
								@click="restoreProjectItem(project)">
								恢复
							</UButton>
						</div>
					</div>
				</div>
			</div>

			<div v-else>
				<div
					v-if="deletedTasks.length === 0"
					class="text-[12px] text-muted px-3 py-2 rounded-md bg-elevated/60 border border-dashed border-default/70">
					暂无已删除任务
				</div>
				<div
					v-else
					class="space-y-2">
					<div
						v-for="task in deletedTasks"
						:key="task.id"
						class="flex items-center justify-between gap-4 rounded-xl border border-default/70 bg-default/70 px-4 py-3">
						<div class="min-w-0 space-y-0.5">
							<div class="text-sm font-semibold text-default truncate">{{ task.title }}</div>
							<div class="text-xs text-muted truncate">{{ getTaskProjectLabel(task.projectId) }}</div>
						</div>
						<div class="flex items-center gap-3">
							<TimeDisplay
								:timestamp="task.deletedAt"
								text-class="text-muted" />
							<UButton
								color="neutral"
								variant="soft"
								size="xs"
								:loading="restoringTaskIds.has(task.id)"
								@click="restoreTaskItem(task)">
								恢复
							</UButton>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed, onMounted, provide, ref, watch } from 'vue'

	import TimeDisplay from '@/components/TimeDisplay.vue'
	import type { ProjectDto } from '@/services/api/projects'
	import { listDeletedProjects, restoreProject } from '@/services/api/projects'
	import type { TaskDto } from '@/services/api/tasks'
	import { listDeletedTasks, restoreTasks } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { useSettingsStore } from '@/stores/settings'

	const toast = useToast()
	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const viewMode = ref<'projects' | 'tasks'>('projects')
	const loading = ref(false)
	const deletedProjects = ref<ProjectDto[]>([])
	const deletedTasks = ref<TaskDto[]>([])
	const restoringProjectIds = ref<Set<string>>(new Set())
	const restoringTaskIds = ref<Set<string>>(new Set())

	const viewOptions = [
		{
			value: 'projects' as const,
			label: 'Projects',
			icon: 'i-lucide-folder',
			iconClass: 'text-emerald-600',
			activeClass: 'bg-default text-default shadow-sm',
		},
		{
			value: 'tasks' as const,
			label: 'Tasks',
			icon: 'i-lucide-list-checks',
			iconClass: 'text-pink-500',
			activeClass: 'bg-default text-default shadow-sm',
		},
	]

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId ?? 'work')

	const projectNameMap = computed(() => {
		const map = new Map<string, string>()
		for (const p of projectsStore.getProjectsOfSpace(activeSpaceId.value)) {
			map.set(p.id, p.title)
		}
		for (const p of deletedProjects.value) {
			map.set(p.id, p.title)
		}
		return map
	})

	const breadcrumbItems = computed(() => [
		{
			label: '回收站',
			icon: 'i-lucide-trash-2',
			description: '被删除的项目与任务会显示在这里，可随时恢复。',
		},
	])
	provide('workspaceBreadcrumbItems', breadcrumbItems)

	function getTaskProjectLabel(projectId: string | null) {
		if (!projectId) return '未分类'
		return projectNameMap.value.get(projectId) ?? '已删除项目'
	}

	async function refresh() {
		loading.value = true
		try {
			await projectsStore.ensureLoaded(activeSpaceId.value)
			const [projects, tasks] = await Promise.all([
				listDeletedProjects({ spaceId: activeSpaceId.value }),
				listDeletedTasks({ spaceId: activeSpaceId.value }),
			])
			deletedProjects.value = projects
			deletedTasks.value = tasks
		} catch (e) {
			toast.add({
				title: '加载失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	}

	async function restoreProjectItem(project: ProjectDto) {
		if (restoringProjectIds.value.has(project.id)) return
		const next = new Set(restoringProjectIds.value)
		next.add(project.id)
		restoringProjectIds.value = next
		try {
			await restoreProject(project.id)
			deletedProjects.value = deletedProjects.value.filter((p) => p.id !== project.id)
			refreshSignals.bumpProject()
			toast.add({
				title: '已恢复项目',
				description: project.title,
				color: 'success',
			})
		} catch (e) {
			toast.add({
				title: '恢复失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			const restored = new Set(restoringProjectIds.value)
			restored.delete(project.id)
			restoringProjectIds.value = restored
		}
	}

	async function restoreTaskItem(task: TaskDto) {
		if (restoringTaskIds.value.has(task.id)) return
		const next = new Set(restoringTaskIds.value)
		next.add(task.id)
		restoringTaskIds.value = next
		try {
			await restoreTasks([task.id])
			deletedTasks.value = deletedTasks.value.filter((t) => t.id !== task.id)
			refreshSignals.bumpTask()
			toast.add({
				title: '已恢复任务',
				description: task.title,
				color: 'success',
			})
		} catch (e) {
			toast.add({
				title: '恢复失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			const restored = new Set(restoringTaskIds.value)
			restored.delete(task.id)
			restoringTaskIds.value = restored
		}
	}

	onMounted(async () => {
		if (!settingsStore.loaded) {
			await settingsStore.load()
		}
		await refresh()
	})

	watch(
		() => settingsStore.settings.activeSpaceId,
		() => {
			refresh()
		},
	)
</script>
