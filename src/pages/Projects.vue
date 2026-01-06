<template>
	<section class="space-y-4">
		<div class="flex items-center justify-between gap-3">
			<div class="space-y-1">
				<div class="text-lg font-semibold">Projects</div>
				<div class="text-sm text-muted">M1：创建与列表（按 Space 过滤）。</div>
			</div>
			<div
				class="text-xs text-muted"
				v-if="loading">
				加载中…
			</div>
		</div>

		<div class="flex items-center gap-2 max-w-xl">
			<UInput
				v-model="name"
				placeholder="输入项目名称，回车创建…"
				class="flex-1"
				color="neutral"
				@keydown.enter.prevent="onCreate" />
			<UButton
				label="创建项目"
				color="neutral"
				@click="onCreate" />
		</div>

		<div
			v-if="projects.length === 0"
			class="text-sm text-muted">
			暂无项目。
		</div>

		<div class="space-y-2">
			<div
				v-for="p in projects"
				:key="p.id"
				class="rounded-md border border-default bg-elevated">
				<button
					type="button"
					class="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-default/50 transition"
					@click="toggleProject(p.id)">
					<div class="min-w-0">
						<div class="text-sm font-medium truncate">{{ p.name }}</div>
						<div class="text-xs text-muted">Space：{{ p.space_id }} · {{ p.status }}</div>
					</div>

					<div class="text-xs text-muted">
						{{ expanded[p.id] ? '收起' : '查看任务' }}
					</div>
				</button>

				<div
					v-if="expanded[p.id]"
					class="border-t border-default p-3 space-y-2">
					<div
						v-if="projectTasksLoading[p.id]"
						class="text-sm text-muted">
						加载中…
					</div>

					<div
						v-else-if="(projectTasks[p.id]?.length ?? 0) === 0"
						class="text-sm text-muted">
						暂无未完成任务（已完成的请去 Finish 查看）。
					</div>

					<div
						v-else
						class="space-y-2">
						<div
							v-for="t in projectTasks[p.id]"
							:key="t.id"
							class="p-3 rounded-md border border-default bg-default flex items-center justify-between gap-3">
							<div class="min-w-0">
								<div class="text-sm font-medium truncate">{{ t.title }}</div>
								<div class="text-xs text-muted">状态：{{ t.status }}</div>
							</div>

							<UButton
								size="sm"
								label="完成"
								color="success"
								variant="subtle"
								@click="onCompleteInProject(p.id, t.id)" />
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, reactive, ref, watch } from 'vue'

	import { createProject, listProjects, type ProjectDto } from '@/services/api/projects'
	import { completeTask, listTasks, type TaskDto } from '@/services/api/tasks'
	import { useSettingsStore } from '@/stores/settings'

	const toast = useToast()
	const settingsStore = useSettingsStore()

	const loading = ref(false)
	const name = ref('')
	const projects = ref<ProjectDto[]>([])

	// 项目任务展开状态（最小实现：点击项目显示其任务列表）
	const expanded = ref<Record<string, boolean>>({})
	const projectTasks = reactive<Record<string, TaskDto[]>>({})
	const projectTasksLoading = ref<Record<string, boolean>>({})

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId)

	async function refresh() {
		loading.value = true
		try {
			const spaceId = activeSpaceId.value === 'all' ? undefined : activeSpaceId.value
			projects.value = await listProjects(spaceId)
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

	async function loadProjectTasks(projectId: string) {
		projectTasksLoading.value[projectId] = true
		try {
			// project 维度过滤即可；space 过滤交给 projects 列表
			const rows = await listTasks({ projectId })
			// M1：这里只展示未完成任务（done 在 Finish 页看）
			projectTasks[projectId] = rows.filter((t) => t.status !== 'done')
		} catch (e) {
			toast.add({
				title: '加载项目任务失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			projectTasksLoading.value[projectId] = false
		}
	}

	async function toggleProject(projectId: string) {
		const next = !expanded.value[projectId]
		expanded.value[projectId] = next
		if (next && !projectTasks[projectId]) {
			await loadProjectTasks(projectId)
		}
	}

	async function onCompleteInProject(projectId: string, taskId: string) {
		try {
			await completeTask(taskId)
			toast.add({ title: '已完成', color: 'success' })
			await loadProjectTasks(projectId)
		} catch (e) {
			toast.add({
				title: '完成失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function onCreate() {
		const v = name.value.trim()
		if (!v) return

		try {
			const spaceId = activeSpaceId.value === 'all' ? 'work' : activeSpaceId.value
			await createProject(spaceId, v)
			name.value = ''
			toast.add({ title: '已创建项目', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '创建失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	onMounted(async () => {
		await settingsStore.load()
		await refresh()
	})

	watch(activeSpaceId, async () => {
		await refresh()
	})
</script>
