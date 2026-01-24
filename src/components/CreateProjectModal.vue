<template>
	<UModal
		v-model:open="isOpen"
		title="New Project"
		description="创建一个新的项目容器"
		:ui="{
			width: 'sm:max-w-2xl',
			rounded: 'rounded-2xl',
		}">
		<template #body>
			<div class="space-y-4">
				<!-- Project Name -->
				<UFormField
					label="Project Name"
					required>
					<UInput
						v-model="form.name"
						placeholder="e.g. Q3 Roadmap"
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

				<!-- Parent Project -->
				<UFormField label="Parent Project">
					<USelectMenu
						v-model="form.parentId"
						:items="parentProjectOptions"
						value-key="value"
						label-key="label"
						size="md"
						placeholder="None (Top Level)"
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

				<!-- Note -->
				<UFormField label="Note">
					<UTextarea
						v-model="form.note"
						placeholder="What is the goal of this project?"
						:rows="3"
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
					Create Project
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { computed, ref, watch } from 'vue'

	import type { ProjectDto } from '@/services/api/projects'
	import { createProject } from '@/services/api/projects'
	import { useProjectsStore } from '@/stores/projects'

	const props = defineProps<{
		modelValue: boolean
		spaceId?: string
		projects?: ProjectDto[]
	}>()

	const emit = defineEmits<{
		'update:modelValue': [value: boolean]
		created: [project: ProjectDto]
	}>()

	const projectsStore = useProjectsStore()

	const loading = ref(false)
	const isOpen = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	})

	const form = ref({
		name: '',
		spaceId: props.spaceId ?? 'work',
		parentId: null as string | null,
		note: null as string | null,
	})

	const canSubmit = computed(() => {
		return form.value.name.trim().length > 0
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

	const parentProjectOptions = computed(() => {
		const options: Array<{
			value: string | null
			label: string
			icon: string
			iconClass: string
			depth: number
		}> = [
			{
				value: null,
				label: 'None (Top Level)',
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
					depth,
				})
				buildTree(project.id, depth + 1)
			}
		}

		buildTree(null, 0)
		return options
	})


	watch(
		() => props.spaceId,
		(newSpaceId) => {
			if (newSpaceId) {
				form.value.spaceId = newSpaceId
			}
		},
	)

	watch(isOpen, (open) => {
		if (open) {
			form.value.name = ''
			form.value.parentId = null
			form.value.note = null
			if (props.spaceId) {
				form.value.spaceId = props.spaceId
			}
		}
	})

	async function handleSubmit() {
		if (!canSubmit.value || loading.value) return

		loading.value = true
		try {
			const project = await createProject({
				spaceId: form.value.spaceId,
				name: form.value.name.trim(),
				parentId: form.value.parentId,
				note: form.value.note?.trim() || null,
			})

			// 刷新项目列表
			await projectsStore.loadForSpace(form.value.spaceId)

			emit('created', project)
			close()
		} catch (error) {
			console.error('创建项目失败:', error)
			// TODO: 显示错误提示
		} finally {
			loading.value = false
		}
	}

	function close() {
		isOpen.value = false
	}
</script>
