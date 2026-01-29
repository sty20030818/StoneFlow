<template>
	<div
		class="rounded-xl border border-dashed border-default/70 bg-elevated/40 px-3 py-2.5 transition-colors"
		:class="wrapperClass"
		@click="focusInput">
		<input
			ref="inputRef"
			v-model="title"
			type="text"
			class="w-full bg-transparent text-sm outline-none placeholder:text-muted/70"
			:placeholder="placeholder"
			:disabled="disabled || submitting"
			@keydown.enter.prevent="handleSubmit" />
	</div>
</template>

<script setup lang="ts">
	import { computed, nextTick, ref, watch } from 'vue'

	import { getDefaultProject } from '@/services/api/projects'
	import { createTask, updateTask, type TaskDto } from '@/services/api/tasks'
	import { useInlineCreateFocusStore } from '@/stores/inline-create-focus'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'

	const props = withDefaults(
		defineProps<{
			spaceId?: string
			projectId?: string | null
			placeholder?: string
			disabled?: boolean
		}>(),
		{
			spaceId: undefined,
			projectId: null,
			placeholder: '输入任务标题，回车快速创建…',
			disabled: false,
		},
	)

	const emit = defineEmits<{
		created: [task: TaskDto]
	}>()

	const inputRef = ref<HTMLInputElement | null>(null)
	const title = ref('')
	const submitting = ref(false)

	const inlineFocusStore = useInlineCreateFocusStore()
	const refreshSignals = useRefreshSignalsStore()

	const wrapperClass = computed(() => {
		if (props.disabled) return 'opacity-60 cursor-not-allowed'
		if (submitting.value) return 'border-primary/60 bg-primary/5'
		return 'hover:border-default focus-within:border-primary/70 focus-within:bg-primary/5'
	})

	function focusInput() {
		if (props.disabled) return
		inputRef.value?.focus()
	}

	watch(
		() => inlineFocusStore.todoFocusTick,
		() => {
			if (props.disabled) return
			// 使用 nextTick 确保输入框已经渲染完成
			nextTick(() => {
				inputRef.value?.focus()
			})
		},
	)

	async function resolveProjectId(spaceId: string): Promise<string | null> {
		if (props.projectId) return props.projectId
		try {
			const defaultProject = await getDefaultProject(spaceId)
			return defaultProject.id
		} catch (error) {
			console.error('加载默认项目失败:', error)
			return null
		}
	}

	async function handleSubmit() {
		const nextTitle = title.value.trim()
		if (!nextTitle || submitting.value || props.disabled) return
		if (!props.spaceId) return

		submitting.value = true
		try {
			const projectId = await resolveProjectId(props.spaceId)

			const task = await createTask({
				spaceId: props.spaceId,
				title: nextTitle,
				autoStart: false,
				projectId,
			})

			// 兜底保证 priority/status 符合约定（默认 P1 / todo）
			const patch: { priority?: string; status?: string } = {}
			if (task.priority !== 'P1') patch.priority = 'P1'
			if (task.status !== 'todo') patch.status = 'todo'
			if (Object.keys(patch).length > 0) {
				await updateTask(task.id, patch)
				Object.assign(task, patch)
			}

			refreshSignals.bumpTask()
			emit('created', task)

			title.value = ''
			await nextTick()
			inputRef.value?.focus()
		} catch (error) {
			console.error('内联创建任务失败:', error)
		} finally {
			submitting.value = false
		}
	}
</script>
