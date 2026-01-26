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
				<!-- Title -->
				<UFormField
					label="Title"
					required>
					<UInput
						v-model="form.title"
						placeholder="输入任务标题..."
						size="md"
						:ui="{
							rounded: 'rounded-xl',
						}"
						autofocus
						@keydown.enter="handleSubmit" />
				</UFormField>

				<!-- Space -->
				<UFormField label="Space">
					<USelectMenu
						v-model="form.spaceId"
						:items="spaceOptions"
						value-key="value"
						label-key="label"
						size="md"
						:search-input="false"
						:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
						<template #item="{ item }">
							<div class="flex items-center gap-2">
								<UIcon
									:name="item.icon"
									class="size-3.5 shrink-0"
									:class="item.iconClass" />
								<span class="truncate">{{ item.label }}</span>
							</div>
						</template>
					</USelectMenu>
				</UFormField>

				<!-- Project -->
				<UFormField label="Project">
					<USelectMenu
						v-model="form.projectId"
						:items="projectOptions"
						value-key="value"
						label-key="label"
						size="md"
						placeholder="未分类"
						:search-input="false"
						:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
						<template #item="{ item }">
							<div
								class="flex items-center gap-2"
								:style="{ paddingLeft: `${(item.depth ?? 0) * 12}px` }">
								<UIcon
									:name="item.icon"
									class="size-3.5 shrink-0"
									:class="item.iconClass" />
								<span class="truncate">{{ item.label }}</span>
							</div>
						</template>
					</USelectMenu>
				</UFormField>

				<!-- Status & Priority -->
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="Status">
						<USelectMenu
							v-model="form.status"
							:items="statusOptionsArray"
							value-key="value"
							label-key="label"
							size="md"
							:search-input="false"
							:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
							<template #item="{ item }">
								<div
									v-if="item"
									class="flex items-center gap-2">
									<UIcon
										:name="item.icon"
										class="size-3.5 shrink-0"
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
							:search-input="false"
							:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
							<template #item="{ item }">
								<div class="flex items-center gap-2">
									<UIcon
										:name="item.icon"
										class="size-3.5 shrink-0"
										:class="item.iconClass" />
									<span>{{ item.label }}</span>
								</div>
							</template>
						</USelectMenu>
					</UFormField>
				</div>

				<!-- Planned Start & End Date -->
				<div class="grid grid-cols-2 gap-4">
					<UFormField label="计划开始时间">
						<UInput
							v-model="form.plannedStartDate"
							type="date"
							size="md"
							:ui="{
								rounded: 'rounded-xl',
							}"
							placeholder="选择开始日期" />
					</UFormField>

					<UFormField label="计划结束时间">
						<UInput
							v-model="form.plannedEndDate"
							type="date"
							size="md"
							:ui="{
								rounded: 'rounded-xl',
							}"
							placeholder="选择截止日期" />
					</UFormField>
				</div>

				<!-- Tags -->
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
							:ui="{
								rounded: 'rounded-xl',
							}"
							@keydown.enter.prevent="addTag" />
					</div>
				</UFormField>

				<!-- Note -->
				<UFormField label="Note (可选)">
					<UTextarea
						v-model="form.note"
						placeholder="记录一些背景信息、想法或链接…"
						:rows="3"
						size="md"
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
	import type { TaskDto } from '@/services/api/tasks'
	import { createTask, updateTask } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'
	import { statusOptions, mapDisplayStatusToBackend } from '@/utils/task'

	const statusOptionsArray = [...statusOptions]

	const props = defineProps<{
		modelValue: boolean
		spaceId?: string
		projects?: ProjectDto[]
	}>()

	const emit = defineEmits<{
		'update:modelValue': [value: boolean]
		created: [task: TaskDto]
	}>()

	const projectsStore = useProjectsStore()

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
		status: 'todo' as 'todo' | 'doing' | 'done',
		priority: 'P1' as string,
		plannedStartDate: '' as string,
		plannedEndDate: '' as string,
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
				iconClass: 'text-amber-500',
				depth: 0,
			},
		]

		// 优先使用 props.projects，否则从 store 获取
		const projectsList = props.projects ?? projectsStore.getProjectsOfSpace(form.value.spaceId)
		if (!projectsList.length) return options

		// 构建树形选项（排除默认项目）
		function buildTree(parentId: string | null, depth: number) {
			const children = projectsList.filter(
				(p) => p.parent_id === parentId && !p.id.endsWith('_default'),
			)
			for (const project of children) {
				options.push({
					value: project.id,
					label: project.name,
					icon: depth === 0 ? 'i-lucide-folder' : 'i-lucide-circle',
					iconClass: depth === 0 ? 'text-amber-500' : 'text-muted',
					depth: depth + 1,
				})
				buildTree(project.id, depth + 1)
			}
		}

		buildTree(null, 0)
		return options
	})

	watch(
		() => props.spaceId,
		async (newSpaceId) => {
			if (newSpaceId) {
				form.value.spaceId = newSpaceId
				// 加载默认项目
				try {
					const defaultProject = await getDefaultProject(newSpaceId)
					defaultProjectId.value = defaultProject.id
					form.value.projectId = defaultProject.id
				} catch (error) {
					console.error('加载默认项目失败:', error)
				}
			}
		},
		{ immediate: true },
	)

	watch(isOpen, async (open) => {
		if (open) {
			form.value.title = ''
			form.value.status = 'todo'
			form.value.priority = 'P1'
			form.value.plannedStartDate = ''
			form.value.plannedEndDate = ''
			form.value.tags = []
			form.value.note = ''
			tagInput.value = ''
			if (props.spaceId) {
				form.value.spaceId = props.spaceId
				// 加载默认项目
				try {
					const defaultProject = await getDefaultProject(form.value.spaceId)
					defaultProjectId.value = defaultProject.id
					form.value.projectId = defaultProject.id
				} catch (error) {
					console.error('加载默认项目失败:', error)
				}
			} else {
				form.value.projectId = defaultProjectId.value
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
				priority?: string
				note?: string | null
				plannedStartAt?: number | null
				plannedEndAt?: number | null
				tags?: string[]
			} = {}

			// 映射显示状态到后端状态
			const backendStatus = mapDisplayStatusToBackend(form.value.status, task.status)
			if (backendStatus !== task.status) {
				updatePatch.status = backendStatus
			}

			if (form.value.priority && form.value.priority !== 'P1') {
				updatePatch.priority = form.value.priority
			}

			if (form.value.note?.trim()) {
				updatePatch.note = form.value.note.trim()
			}

			if (form.value.plannedStartDate) {
				const date = new Date(form.value.plannedStartDate)
				date.setHours(0, 0, 0, 0)
				updatePatch.plannedStartAt = date.getTime()
			}

			if (form.value.plannedEndDate) {
				// 将日期转换为时间戳（UTC 午夜）
				const date = new Date(form.value.plannedEndDate)
				date.setHours(23, 59, 59, 999) // 设置为当天的 23:59:59
				updatePatch.plannedEndAt = date.getTime()
			}

			if (form.value.tags.length > 0) {
				updatePatch.tags = form.value.tags
			}

			// 如果有需要更新的字段，执行更新
			if (Object.keys(updatePatch).length > 0) {
				await updateTask(task.id, updatePatch)
				// 更新本地任务对象
				Object.assign(task, updatePatch)
			}

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
