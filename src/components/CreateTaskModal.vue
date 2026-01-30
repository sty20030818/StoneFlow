<template>
	<UModal
		v-model:open="isOpen"
		title="New Task"
		description="快速创建一个新任务"
		:ui="{
			width: 'sm:max-w-2xl',
			rounded: 'rounded-2xl',
		}">
		<template #body>
			<div class="space-y-4">
				<!-- Title (占满一行) -->
				<UFormField
					label="Title"
					required>
					<UInput
						v-model="form.title"
						placeholder="输入任务标题..."
						size="md"
						class="w-full"
						:ui="{
							rounded: 'rounded-xl',
						}"
						autofocus
						@keydown.enter="handleSubmit" />
				</UFormField>

				<!-- Space + Project (两列) -->
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="Space">
						<USelectMenu
							v-model="form.spaceId"
							:items="spaceOptions"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							:search-input="false"
							:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
							<template #item="{ item }">
								<div class="flex items-center gap-2 py-0.5">
									<UIcon
										:name="item.icon"
										class="size-4 shrink-0"
										:class="item.iconClass" />
									<span class="truncate">{{ item.label }}</span>
								</div>
							</template>
						</USelectMenu>
					</UFormField>

					<UFormField label="Project">
						<USelectMenu
							v-model="form.projectId"
							:items="projectOptions"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							placeholder="未分类"
							:search-input="false"
							:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
							<template #item="{ item }">
								<div
									class="flex items-center gap-2 py-1"
									:style="{ paddingLeft: `${(item.depth ?? 0) * 16}px` }">
									<UIcon
										:name="item.icon"
										class="size-4 shrink-0"
										:class="item.iconClass" />
									<span class="truncate">{{ item.label }}</span>
								</div>
							</template>
						</USelectMenu>
					</UFormField>
				</div>

				<!-- Status + Priority (两列) -->
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="Status">
						<USelectMenu
							v-model="form.status"
							:items="statusOptionsArray"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							:search-input="false"
							:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
							<template #item="{ item }">
								<div
									v-if="item"
									class="flex items-center gap-2 py-0.5">
									<UIcon
										:name="item.icon"
										class="size-4 shrink-0"
										:class="item.iconClass" />
									<span>{{ item.label }}</span>
								</div>
							</template>
						</USelectMenu>
					</UFormField>

					<UFormField label="Priority">
						<USelectMenu
							v-model="form.priority"
							:items="priorityOptions"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							:search-input="false"
							:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
							<template #item="{ item }">
								<div class="flex items-center gap-2 py-0.5">
									<UIcon
										:name="item.icon"
										class="size-4 shrink-0"
										:class="item.iconClass" />
									<span>{{ item.label }}</span>
								</div>
							</template>
						</USelectMenu>
					</UFormField>
				</div>

				<!-- Done Reason（仅已完成） -->
				<UFormField
					v-if="form.status === 'done'"
					label="完成类型">
					<USelectMenu
						v-model="form.doneReason"
						:items="doneReasonOptions"
						value-key="value"
						label-key="label"
						size="md"
						class="w-full"
						:search-input="false"
						:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
						<template #item="{ item }">
							<div class="flex items-center gap-2 py-0.5">
								<UIcon
									:name="item.icon"
									class="size-4 shrink-0"
									:class="item.iconClass" />
								<span>{{ item.label }}</span>
							</div>
						</template>
					</USelectMenu>
				</UFormField>

				<!-- Deadline -->
				<UFormField label="截止时间">
					<UInput
						v-model="form.deadlineDate"
						type="date"
						size="md"
						class="w-full"
						:ui="{
							rounded: 'rounded-xl',
						}"
						placeholder="选择截止日期" />
				</UFormField>

				<!-- Tags (占满一行) -->
				<UFormField label="Tags (可选)">
					<div class="space-y-2">
						<div class="flex flex-wrap gap-2">
							<UBadge
								v-for="tag in form.tags"
								:key="tag"
								color="neutral"
								variant="soft"
								size="sm"
								class="cursor-pointer"
								@click="removeTag(tag)">
								#{{ tag }}
								<template #trailing>
									<UIcon
										name="i-lucide-x"
										class="size-3 ml-1" />
								</template>
							</UBadge>
						</div>
						<UInput
							v-model="tagInput"
							placeholder="输入标签后按回车添加"
							size="md"
							class="w-full"
							:ui="{
								rounded: 'rounded-xl',
							}"
							@keydown.enter.prevent="addTag" />
					</div>
				</UFormField>

				<!-- Note (占满一行) -->
				<UFormField label="Note (可选)">
					<UTextarea
						v-model="form.note"
						placeholder="记录一些背景信息、想法或链接…"
						:rows="3"
						size="md"
						class="w-full"
						autoresize
						:ui="{
							rounded: 'rounded-xl',
						}" />
				</UFormField>
			</div>
		</template>

		<template #footer>
			<div class="flex items-center justify-end gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					size="sm"
					@click="close">
					Cancel
				</UButton>
				<UButton
					color="primary"
					size="sm"
					:disabled="!canSubmit"
					:loading="loading"
					@click="handleSubmit">
					Create Task
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { computed, ref, watch } from 'vue'

	import type { ProjectDto } from '@/services/api/projects'
	import { getDefaultProject } from '@/services/api/projects'
	import type { TaskDoneReason, TaskDto } from '@/services/api/tasks'
	import { createTask, updateTask } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { statusOptions } from '@/utils/task'

	const statusOptionsArray = [...statusOptions]

	const props = defineProps<{
		modelValue: boolean
		spaceId?: string
		projectId?: string
		projects?: ProjectDto[]
	}>()

	const emit = defineEmits<{
		'update:modelValue': [value: boolean]
		created: [task: TaskDto]
	}>()

	const projectsStore = useProjectsStore()
	const refreshSignals = useRefreshSignalsStore()

	const loading = ref(false)
	const defaultProjectId = ref<string | null>(null)
	const isOpen = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	})

	const form = ref({
		title: '',
		spaceId: props.spaceId ?? 'work',
		projectId: null as string | null,
		status: 'todo' as 'todo' | 'done',
		doneReason: 'completed' as TaskDoneReason,
		priority: 'P1' as string,
		deadlineDate: '' as string,
		tags: [] as string[],
		note: '' as string,
	})

	const tagInput = ref('')

	const canSubmit = computed(() => {
		return form.value.title.trim().length > 0
	})

	const spaceOptions = [
		{
			value: 'work',
			label: 'Work',
			icon: 'i-lucide-briefcase',
			iconClass: 'text-blue-500',
		},
		{
			value: 'personal',
			label: 'Personal',
			icon: 'i-lucide-user',
			iconClass: 'text-purple-500',
		},
		{
			value: 'study',
			label: 'Study',
			icon: 'i-lucide-book-open',
			iconClass: 'text-green-500',
		},
	]

	const priorityOptions = [
		{
			value: 'P0',
			label: 'P0 - 紧急',
			icon: 'i-lucide-alert-circle',
			iconClass: 'text-red-500',
		},
		{
			value: 'P1',
			label: 'P1 - 高',
			icon: 'i-lucide-flag',
			iconClass: 'text-amber-500',
		},
		{
			value: 'P2',
			label: 'P2 - 中',
			icon: 'i-lucide-flag',
			iconClass: 'text-blue-500',
		},
		{
			value: 'P3',
			label: 'P3 - 低',
			icon: 'i-lucide-flag',
			iconClass: 'text-muted',
		},
	]

	const doneReasonOptions = [
		{ value: 'completed', label: '完成', icon: 'i-lucide-check-circle', iconClass: 'text-emerald-500' },
		{ value: 'cancelled', label: '取消', icon: 'i-lucide-x-circle', iconClass: 'text-red-500' },
	] as const

	// 层级颜色（与 Sidebar / CreateProject 保持一致）
	const levelColors = ['text-amber-400', 'text-sky-400', 'text-violet-400', 'text-emerald-400', 'text-rose-400']

	function addTag() {
		const tag = tagInput.value.trim()
		if (tag && !form.value.tags.includes(tag)) {
			form.value.tags.push(tag)
			tagInput.value = ''
		}
	}

	function removeTag(tag: string) {
		form.value.tags = form.value.tags.filter((t) => t !== tag)
	}

	const projectOptions = computed(() => {
		const options: Array<{
			value: string | null
			label: string
			icon: string
			iconClass: string
			depth: number
		}> = [
			{
				value: null,
				label: '未分类',
				icon: 'i-lucide-folder',
				iconClass: 'text-slate-400',
				depth: 0,
			},
		]

		// 以 store 为准，props 仅作为兜底且按 space 过滤，避免切换 space 后仍使用旧数据
		const storeProjects = projectsStore.getProjectsOfSpace(form.value.spaceId)
		const fallbackProjects = (props.projects ?? []).filter((p) => p.space_id === form.value.spaceId)
		const projectsList = storeProjects.length > 0 ? storeProjects : fallbackProjects
		if (!projectsList.length) return options

		// 构建树形选项（排除默认项目）
		function buildTree(parentId: string | null, depth: number) {
			const children = projectsList.filter((p) => p.parent_id === parentId && !p.id.endsWith('_default'))
			for (const project of children) {
				options.push({
					value: project.id,
					label: project.name,
					icon: 'i-lucide-folder',
					iconClass: levelColors[depth % levelColors.length],
					depth,
				})
				buildTree(project.id, depth + 1)
			}
		}

		buildTree(null, 0)
		return options
	})

	// 监听用户手动切换 Space 时重置 Project 选择
	watch(
		() => form.value.spaceId,
		async (newSpaceId, oldSpaceId) => {
			// 只有当 spaceId 实际变化时才重置（排除初始化）
			if (oldSpaceId && newSpaceId !== oldSpaceId) {
				form.value.projectId = null
			}
			// 加载对应 Space 的项目，确保下拉项及时刷新
			await projectsStore.loadForSpace(newSpaceId)
			// 加载对应 Space 的默认项目
			try {
				const defaultProject = await getDefaultProject(newSpaceId)
				defaultProjectId.value = defaultProject.id
				form.value.projectId = defaultProject.id
			} catch (error) {
				console.error('加载默认项目失败:', error)
			}
		},
	)

	// 监听 props.spaceId 变化，同步到 form
	watch(
		() => props.spaceId,
		(newSpaceId) => {
			if (newSpaceId) {
				form.value.spaceId = newSpaceId
			}
		},
		{ immediate: true },
	)

	watch(isOpen, async (open) => {
		if (open) {
			form.value.title = ''
			form.value.status = 'todo'
			form.value.doneReason = 'completed'
			form.value.priority = 'P1'
			form.value.deadlineDate = ''
			form.value.tags = []
			form.value.note = ''
			tagInput.value = ''
			if (props.spaceId) {
				form.value.spaceId = props.spaceId
			}
			// 打开弹窗时确保当前 Space 的项目已加载
			await projectsStore.loadForSpace(form.value.spaceId)
			// 加载默认项目
			try {
				const defaultProject = await getDefaultProject(form.value.spaceId)
				defaultProjectId.value = defaultProject.id

				// 如果当前页面处于某个 project，优先使用该 project 作为默认值
				const candidateProjectId = props.projectId ?? null
				const projectsOfSpace = projectsStore.getProjectsOfSpace(form.value.spaceId)
				const hasCandidate = !!candidateProjectId && projectsOfSpace.some((p) => p.id === candidateProjectId)
				form.value.projectId = hasCandidate ? candidateProjectId : defaultProjectId.value
			} catch (error) {
				console.error('加载默认项目失败:', error)
			}
		}
	})

	async function handleSubmit() {
		if (!canSubmit.value || loading.value) return

		loading.value = true
		try {
			// 如果没有选择项目，使用默认项目
			const projectId = form.value.projectId ?? defaultProjectId.value

			// 创建任务
			const task = await createTask({
				spaceId: form.value.spaceId,
				title: form.value.title.trim(),
				autoStart: false,
				projectId,
			})

			// 如果有额外的字段，更新任务
			const updatePatch: {
				status?: string
				doneReason?: TaskDoneReason | null
				priority?: string
				note?: string | null
				deadlineAt?: number | null
				tags?: string[]
			} = {}

			if (form.value.status === 'done') {
				updatePatch.status = 'done'
				updatePatch.doneReason = form.value.doneReason ?? 'completed'
			}

			if (form.value.priority && form.value.priority !== 'P1') {
				updatePatch.priority = form.value.priority
			}

			if (form.value.note?.trim()) {
				updatePatch.note = form.value.note.trim()
			}

			if (form.value.deadlineDate) {
				const date = new Date(form.value.deadlineDate)
				date.setHours(0, 0, 0, 0)
				updatePatch.deadlineAt = date.getTime()
			}

			if (form.value.tags.length > 0) {
				updatePatch.tags = form.value.tags
			}

			// 如果有需要更新的字段，执行更新
			if (Object.keys(updatePatch).length > 0) {
				await updateTask(task.id, updatePatch)
				// 更新本地任务对象（对齐 snake_case 字段）
				if (updatePatch.status) task.status = updatePatch.status as TaskDto['status']
				if (updatePatch.doneReason !== undefined) task.done_reason = updatePatch.doneReason
				if (updatePatch.deadlineAt !== undefined) task.deadline_at = updatePatch.deadlineAt
				if (updatePatch.priority) task.priority = updatePatch.priority
				if (updatePatch.note !== undefined) task.note = updatePatch.note
				if (updatePatch.tags) task.tags = updatePatch.tags
			}

			// 发布刷新信号，驱动列表重新拉取
			refreshSignals.bumpTask()
			emit('created', task)
			close()
		} catch (error) {
			console.error('创建任务失败:', error)
			// TODO: 显示错误提示
		} finally {
			loading.value = false
		}
	}

	function close() {
		isOpen.value = false
	}
</script>
