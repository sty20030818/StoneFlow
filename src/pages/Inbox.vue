<template>
	<section class="space-y-4">
		<div class="flex items-center justify-between gap-3">
			<div class="space-y-1">
				<div class="text-lg font-semibold">Inbox</div>
				<div class="text-sm text-muted">未归档任务（project_id = NULL），用于快速收集与处理。</div>
			</div>

			<div
				class="text-xs text-muted"
				v-if="loading">
				加载中…
			</div>
		</div>

		<div class="flex items-center gap-2 max-w-xl">
			<UInput
				v-model="title"
				placeholder="输入任务标题，回车创建…"
				class="flex-1"
				color="neutral"
				@keydown.enter.prevent="onCreate" />
			<UButton
				label="创建"
				color="neutral"
				@click="onCreate" />
		</div>

		<div
			v-if="inboxTasks.length === 0"
			class="text-sm text-muted">
			暂无任务。
		</div>

		<div class="space-y-2">
			<div
				v-for="t in inboxTasks"
				:key="t.id"
				class="p-3 rounded-md border border-default bg-elevated flex items-center justify-between gap-3">
				<div class="min-w-0">
					<div class="text-sm font-medium truncate">{{ t.title }}</div>
					<div class="text-xs text-muted">状态：{{ t.status }} · Space：{{ t.space_id }}</div>
				</div>

				<div class="shrink-0 flex items-center gap-2">
					<UButton
						size="sm"
						label="完成"
						color="success"
						variant="subtle"
						@click="onComplete(t.id)" />

					<USelect
						v-if="projectOptionsForTask(t).length > 0"
						:items="projectOptionsForTask(t)"
						value-key="value"
						size="sm"
						color="neutral"
						placeholder="归档到项目…"
						class="w-40"
						@update:model-value="(v) => onArchiveToProject(t, String(v))" />

					<UButton
						size="sm"
						label="时间线"
						color="neutral"
						variant="outline"
						@click="openTimeline(t)" />
				</div>
			</div>
		</div>

		<UModal
			v-model:open="timelineOpen"
			title="编辑时间线（轻量版）">
			<template #body>
				<div class="space-y-4">
					<div class="grid gap-2">
						<div class="text-sm font-medium text-default">created_at</div>
						<UInput
							v-model="createdAtInput"
							type="datetime-local"
							color="neutral" />
						<div class="text-xs text-muted">规则：不允许未来时间；started_at 不得早于 created_at。</div>
					</div>

					<div class="grid gap-2">
						<div class="flex items-center justify-between">
							<div class="text-sm font-medium text-default">started_at</div>
							<USwitch
								v-model="startedAtEnabled"
								label="启用"
								color="neutral" />
						</div>
						<UInput
							v-model="startedAtInput"
							type="datetime-local"
							color="neutral"
							:disabled="!startedAtEnabled" />
					</div>

					<div class="grid gap-2">
						<div class="text-sm font-medium text-default">修改原因</div>
						<UInput
							v-model="timelineReason"
							placeholder="例如：补录真实开始时间"
							color="neutral" />
					</div>
				</div>
			</template>

			<template #footer>
				<div class="flex justify-end gap-2">
					<UButton
						label="取消"
						color="neutral"
						variant="outline"
						@click="timelineOpen = false" />
					<UButton
						label="保存"
						color="neutral"
						@click="submitTimeline" />
				</div>
			</template>
		</UModal>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref, watch } from 'vue'

	import { listProjects, type ProjectDto } from '@/services/api/projects'
	import {
		completeTask,
		createTask,
		listTasks,
		updateTask,
		updateTaskTimeline,
		type TaskDto,
	} from '@/services/api/tasks'
	import { useSettingsStore } from '@/stores/settings'

	const toast = useToast()
	const settingsStore = useSettingsStore()

	const title = ref('')
	const loading = ref(false)
	const tasks = ref<TaskDto[]>([])
	const projects = ref<ProjectDto[]>([])

	const activeSpaceId = computed(() => settingsStore.settings.activeSpaceId)
	const autoStart = computed(() => settingsStore.settings.autoStart)

	const inboxTasks = computed(() => {
		return tasks.value.filter((t) => t.project_id == null).filter((t) => t.status !== 'done')
	})

	function projectOptionsForTask(task: TaskDto) {
		// 当 activeSpaceId === 'all' 时，只显示与任务同 space 的项目，避免跨 space 归档。
		const options = projects.value
			.filter((p) => p.space_id === task.space_id)
			.map((p) => ({ label: p.name, value: p.id }))
		return options
	}

	async function refresh() {
		loading.value = true
		try {
			const spaceId = activeSpaceId.value === 'all' ? undefined : activeSpaceId.value
			// Inbox：只取 project_id = NULL 的任务；status 先不过滤（前端过滤掉 done）。
			tasks.value = await listTasks({ spaceId, projectId: null })
			// Projects：用于“归档到项目”下拉；all 视图则拉全量，后续按 task.space_id 过滤展示。
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

	async function onCreate() {
		const v = title.value.trim()
		if (!v) return

		try {
			const spaceId = activeSpaceId.value === 'all' ? 'work' : activeSpaceId.value
			await createTask({
				spaceId,
				title: v,
				autoStart: autoStart.value,
			})
			title.value = ''
			toast.add({ title: '已创建任务', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '创建失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function onComplete(id: string) {
		try {
			await completeTask(id)
			toast.add({ title: '已完成', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '完成失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	async function onArchiveToProject(task: TaskDto, projectId: string) {
		try {
			await updateTask(task.id, { projectId })
			toast.add({ title: '已归档到项目', color: 'success' })
			await refresh()
		} catch (e) {
			toast.add({
				title: '归档失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		}
	}

	// ===== 时间线编辑（轻量版）=====
	const timelineOpen = ref(false)
	const timelineTask = ref<TaskDto | null>(null)
	const timelineReason = ref('')
	const createdAtInput = ref<string>('')
	const startedAtEnabled = ref(false)
	const startedAtInput = ref<string>('')

	function msToLocalInput(ms: number | null): string {
		if (!ms) return ''
		const d = new Date(ms)
		const pad = (n: number) => String(n).padStart(2, '0')
		const yyyy = d.getFullYear()
		const MM = pad(d.getMonth() + 1)
		const dd = pad(d.getDate())
		const hh = pad(d.getHours())
		const mm = pad(d.getMinutes())
		return `${yyyy}-${MM}-${dd}T${hh}:${mm}`
	}

	function localInputToMs(v: string): number | undefined {
		if (!v) return undefined
		const t = new Date(v).getTime()
		return Number.isFinite(t) ? t : undefined
	}

	function openTimeline(task: TaskDto) {
		timelineTask.value = task
		timelineReason.value = ''
		createdAtInput.value = msToLocalInput(task.created_at)
		startedAtEnabled.value = task.started_at != null
		startedAtInput.value = msToLocalInput(task.started_at)
		timelineOpen.value = true
	}

	async function submitTimeline() {
		const task = timelineTask.value
		if (!task) return

		try {
			const createdAt = localInputToMs(createdAtInput.value)
			const startedAt = startedAtEnabled.value ? (localInputToMs(startedAtInput.value) ?? null) : null

			await updateTaskTimeline({
				id: task.id,
				createdAt,
				startedAt,
				reason: timelineReason.value,
			})

			toast.add({ title: '时间线已更新', color: 'success' })
			timelineOpen.value = false
			await refresh()
		} catch (e) {
			toast.add({
				title: '更新时间线失败',
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
