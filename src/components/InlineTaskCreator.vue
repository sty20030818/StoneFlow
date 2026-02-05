<template>
	<div
		class="group rounded-lg border border-default/50 bg-elevated/40 px-3 py-2.5 transition-all duration-150 ease-out select-none"
		:class="wrapperClass"
		@click.self="focusInput">
		<div
			class="flex min-h-6 items-center gap-2"
			@click="focusInput">
			<input
				ref="inputRef"
				v-model="title"
				type="text"
				class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70 select-text"
				:placeholder="placeholder"
				:disabled="disabled || submitting" />
			<span
				v-if="priority"
				class="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold transition-transform duration-150 ease-out"
				:class="priorityBadgeClass">
				{{ priority }}
			</span>
		</div>
		<div
			class="overflow-hidden transition-all duration-200 ease-out"
			:class="noteWrapperClass">
			<textarea
				ref="noteRef"
				v-model="note"
				rows="1"
				class="w-full resize-none bg-transparent text-sm leading-5 outline-none placeholder:text-muted/70 select-text"
				placeholder="写点备注…"
				:disabled="disabled || submitting"></textarea>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed, nextTick, ref, watch } from 'vue'
	import { useEventListener } from '@vueuse/core'

	import type { TaskPriorityValue } from '@/config/task'
	import { getDefaultProject } from '@/services/api/projects'
	import { createTask, updateTask, type TaskDto, type UpdateTaskPatch } from '@/services/api/tasks'
	import { useInlineCreateFocusStore } from '@/stores/inline-create-focus'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { getPriorityClass } from '@/utils/priority'

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
			placeholder: '输入标题，Cmd/Ctrl+Enter 创建，Shift+Enter 写备注…',
			disabled: false,
		},
	)

	const emit = defineEmits<{
		created: [task: TaskDto]
	}>()

	const inputRef = ref<HTMLInputElement | null>(null)
	const noteRef = ref<HTMLTextAreaElement | null>(null)
	const title = ref('')
	const note = ref('')
	const priority = ref<TaskPriorityValue | null>(null)
	const expanded = ref(false)
	const submitting = ref(false)

	const inlineFocusStore = useInlineCreateFocusStore()
	const refreshSignals = useRefreshSignalsStore()

	const wrapperClass = computed(() => {
		if (props.disabled) return 'opacity-60 cursor-not-allowed'
		if (submitting.value) return 'border-primary/60 bg-primary/5'
		return 'hover:border-primary/40 hover:bg-elevated/70 hover:shadow-sm focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20 active:translate-y-[1px]'
	})

	const noteWrapperClass = computed(() => {
		if (expanded.value || note.value.length > 0) return 'mt-2 max-h-8 opacity-100'
		return 'max-h-0 opacity-0 pointer-events-none'
	})

	const priorityBadgeClass = computed(() => getPriorityClass(priority.value ?? 'P1'))

	function focusInput() {
		if (props.disabled) return
		inputRef.value?.focus()
	}

	function resetDraft(target?: HTMLElement | null) {
		title.value = ''
		note.value = ''
		priority.value = null
		expanded.value = false
		target?.blur()
	}

	function cyclePriority() {
		if (props.disabled || submitting.value) return
		const order: TaskPriorityValue[] = ['P0', 'P1', 'P2', 'P3']
		if (!priority.value) {
			priority.value = order[0]
			return
		}
		const nextIndex = (order.indexOf(priority.value) + 1) % order.length
		priority.value = order[nextIndex]
	}

	function openNote() {
		expanded.value = true
		nextTick(() => {
			noteRef.value?.focus()
		})
	}

	function handleKeydown(source: 'title' | 'note', event: KeyboardEvent) {
		if (event.key === 'Tab') {
			event.preventDefault()
			cyclePriority()
			return
		}

		if (event.key === 'Escape') {
			event.preventDefault()
			resetDraft(event.target as HTMLElement | null)
			return
		}

		if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
			event.preventDefault()
			handleSubmit()
			return
		}

		if (event.key === 'Enter') {
			if (source === 'title' && event.shiftKey) {
				event.preventDefault()
				openNote()
				return
			}
			event.preventDefault()
		}
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

	useEventListener(inputRef, 'keydown', (event) => handleKeydown('title', event))
	useEventListener(noteRef, 'keydown', (event) => handleKeydown('note', event))

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
		const nextNote = note.value.trim()
		const nextPriority = priority.value ?? 'P1'

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
			const patch: UpdateTaskPatch = {}
			if (task.priority !== nextPriority) patch.priority = nextPriority
			if (nextNote) patch.note = nextNote
			if (task.status !== 'todo') patch.status = 'todo'
			if (Object.keys(patch).length > 0) {
				await updateTask(task.id, patch)
				Object.assign(task, patch)
			}

			refreshSignals.bumpTask()
			emit('created', task)

			title.value = ''
			note.value = ''
			priority.value = null
			expanded.value = false
			await nextTick()
			inputRef.value?.focus()
		} catch (error) {
			console.error('内联创建任务失败:', error)
		} finally {
			submitting.value = false
		}
	}
</script>
