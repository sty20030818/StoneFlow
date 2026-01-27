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
				<!-- Project Name (占满一行) -->
				<UFormField
					label="Project Name"
					required>
					<UInput
						v-model="form.name"
						placeholder="e.g. Q3 Roadmap"
						size="md"
						class="w-full"
						:ui="{
							rounded: 'rounded-xl',
						}"
						autofocus
						@keydown.enter="handleSubmit" />
				</UFormField>

				<!-- Space + Parent Project (两列) -->
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
							:ui="selectMenuUi">
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

					<UFormField label="Parent Project">
						<USelectMenu
							v-model="form.parentId"
							:items="currentParentProjectOptions"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							placeholder="None (Top Level)"
							:search-input="false"
							:ui="selectMenuUi">
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
							:items="statusOptions"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							:search-input="false"
							:ui="selectMenuUi">
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

					<UFormField label="Priority">
						<USelectMenu
							v-model="form.priority"
							:items="priorityOptions"
							value-key="value"
							label-key="label"
							size="md"
							class="w-full"
							:search-input="false"
							:ui="selectMenuUi">
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

				<!-- Note (占满一行) -->
				<UFormField label="Note">
					<UTextarea
						v-model="form.note"
						placeholder="What is the goal of this project?"
						:rows="3"
						class="w-full"
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
	import { computed, reactive, ref, watch } from 'vue'

	import type { ProjectDto } from '@/services/api/projects'
	import { createProject } from '@/services/api/projects'
	import { useProjectsStore } from '@/stores/projects'

	// ============ Props & Emits ============
	const props = defineProps<{
		modelValue: boolean
		spaceId?: string
		projects?: ProjectDto[]
	}>()

	const emit = defineEmits<{
		'update:modelValue': [value: boolean]
		created: [project: ProjectDto]
	}>()

	// ============ Store ============
	const projectsStore = useProjectsStore()

	// ============ State ============
	const loading = ref(false)

	const isOpen = computed({
		get: () => props.modelValue,
		set: (value) => emit('update:modelValue', value),
	})

	// 使用 reactive 而不是 ref，确保嵌套属性的响应式
	const form = reactive({
		name: '',
		spaceId: props.spaceId ?? 'work',
		parentId: null as string | null,
		note: null as string | null,
		status: 'active' as string,
		priority: 'P1' as string,
	})

	const canSubmit = computed(() => form.name.trim().length > 0)

	// ============ UI Config ============
	const selectMenuUi = {
		rounded: 'rounded-xl',
		width: 'w-full',
	}

	// ============ Options Data ============
	const spaceOptions = [
		{ value: 'work', label: 'Work', icon: 'i-lucide-briefcase', iconClass: 'text-blue-500' },
		{ value: 'personal', label: 'Personal', icon: 'i-lucide-user', iconClass: 'text-purple-500' },
		{ value: 'study', label: 'Study', icon: 'i-lucide-book-open', iconClass: 'text-green-500' },
	]

	const statusOptions = [
		{ value: 'active', label: 'Active', icon: 'i-lucide-play-circle', iconClass: 'text-emerald-500' },
		{ value: 'paused', label: 'Paused', icon: 'i-lucide-pause-circle', iconClass: 'text-amber-500' },
		{ value: 'done', label: 'Done', icon: 'i-lucide-check-circle', iconClass: 'text-blue-500' },
	]

	const priorityOptions = [
		{ value: 'P0', label: 'P0 - Critical', icon: 'i-lucide-alert-circle', iconClass: 'text-rose-500' },
		{ value: 'P1', label: 'P1 - High', icon: 'i-lucide-flag', iconClass: 'text-amber-500' },
		{ value: 'P2', label: 'P2 - Medium', icon: 'i-lucide-flag', iconClass: 'text-blue-500' },
		{ value: 'P3', label: 'P3 - Low', icon: 'i-lucide-flag', iconClass: 'text-muted' },
	]

	// 层级颜色（与 Sidebar 保持一致）
	const levelColors = ['text-amber-400', 'text-sky-400', 'text-violet-400', 'text-emerald-400', 'text-rose-400']

	// ============ Parent Project Options ============
	// 用于缓存当前 Space 的项目选项
	const currentParentProjectOptions = ref<
		Array<{
			value: string | null
			label: string
			icon: string
			iconClass: string
			depth: number
		}>
	>([{ value: null, label: 'None (Top Level)', icon: 'i-lucide-folder', iconClass: 'text-slate-400', depth: 0 }])

	// 根据 spaceId 构建项目树形选项
	function buildParentProjectOptions(spaceId: string) {
		// 以 store 为准，props 仅作为兜底且按 space 过滤，避免切换 space 后仍使用旧数据
		const storeProjects = projectsStore.getProjectsOfSpace(spaceId)
		const fallbackProjects = (props.projects ?? []).filter((p) => p.space_id === spaceId)
		const projectsList = storeProjects.length > 0 ? storeProjects : fallbackProjects

		// 过滤掉默认项目
		const filtered = projectsList.filter((p) => !p.id.endsWith('_default'))

		// 按 parent_id 分组
		const byParent = new Map<string | null, typeof filtered>()
		for (const p of filtered) {
			const bucket = byParent.get(p.parent_id) ?? []
			bucket.push(p)
			byParent.set(p.parent_id, bucket)
		}

		type OptionItem = {
			value: string | null
			label: string
			icon: string
			iconClass: string
			depth: number
		}

		const options: OptionItem[] = [
			{
				value: null,
				label: 'None (Top Level)',
				icon: 'i-lucide-folder',
				iconClass: 'text-slate-400',
				depth: 0,
			},
		]

		function buildTree(parentId: string | null, depth: number) {
			const children = byParent.get(parentId) ?? []
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
	}

	// 刷新项目选项
	async function refreshParentProjectOptions() {
		await projectsStore.loadForSpace(form.spaceId)
		currentParentProjectOptions.value = buildParentProjectOptions(form.spaceId)
	}

	// ============ Watchers ============
	// 监听 Space 切换
	watch(
		() => form.spaceId,
		async (newSpaceId, oldSpaceId) => {
			// 如果是用户手动切换，重置 parentId
			if (oldSpaceId && newSpaceId !== oldSpaceId) {
				form.parentId = null
			}
			// 刷新项目选项
			await refreshParentProjectOptions()
		},
	)

	// 同步 props.spaceId 到 form
	watch(
		() => props.spaceId,
		(newSpaceId) => {
			if (newSpaceId) {
				form.spaceId = newSpaceId
			}
		},
	)

	// Modal 打开时重置表单
	watch(isOpen, async (open) => {
		if (open) {
			// 重置表单
			form.name = ''
			form.parentId = null
			form.note = null
			form.status = 'active'
			form.priority = 'P1'

			// 同步 props.spaceId
			if (props.spaceId) {
				form.spaceId = props.spaceId
			}

			// 刷新项目选项
			await refreshParentProjectOptions()
		}
	})

	// ============ Methods ============
	async function handleSubmit() {
		if (!canSubmit.value || loading.value) return

		loading.value = true
		try {
			const project = await createProject({
				spaceId: form.spaceId,
				name: form.name.trim(),
				parentId: form.parentId,
				note: form.note?.trim() || null,
				status: form.status,
				priority: form.priority,
			})

			// 强制刷新项目列表
			await projectsStore.loadForSpace(form.spaceId, true)

			emit('created', project)
			close()
		} catch (error) {
			console.error('创建项目失败:', error)
		} finally {
			loading.value = false
		}
	}

	function close() {
		isOpen.value = false
	}
</script>
