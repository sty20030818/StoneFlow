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
	import { createTask } from '@/services/api/tasks'
	import { useProjectsStore } from '@/stores/projects'

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
	})

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

			const task = await createTask({
				spaceId: form.value.spaceId,
				title: form.value.title.trim(),
				autoStart: false,
				projectId,
			})

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
