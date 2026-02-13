<template>
	<div
		v-motion="creatorInteractionMotion"
		class="group rounded-lg border border-default/50 bg-elevated/40 px-3 py-2.5 select-none"
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
				v-motion="priorityBadgeMotion"
				class="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold"
				:class="priorityBadgeClass">
				{{ priority }}
			</span>
		</div>
		<div
			v-if="expanded || note.length > 0"
			v-motion="noteSectionMotion"
			class="mt-2 overflow-hidden">
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
	import type { MotionVariants } from '@vueuse/motion'
	import { computed, nextTick, ref, watch } from 'vue'
	import { refDebounced, useEventListener } from '@vueuse/core'

	import { MOTION_TOKENS } from '@/config/motion'
	import { useMotionPreset, useMotionPresetWithDelay, withMotionDelay } from '@/composables/base/motion'
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
			enterDelay?: number
			disabled?: boolean
		}>(),
		{
			spaceId: undefined,
			projectId: null,
			placeholder: '输入标题，Cmd/Ctrl+Enter 创建，Shift+Enter 写备注…',
			enterDelay: 0,
			disabled: false,
		},
	)

	const emit = defineEmits<{
		created: [task: TaskDto]
	}>()

	const inputRef = ref<HTMLInputElement | null>(null)
	const noteRef = ref<HTMLTextAreaElement | null>(null)
	const title = ref('')
	const debouncedTitle = refDebounced(title, 90)
	const note = ref('')
	const priority = ref<TaskPriorityValue | null>(null)
	const expanded = ref(false)
	const submitting = ref(false)

	const inlineFocusStore = useInlineCreateFocusStore()
	const refreshSignals = useRefreshSignalsStore()
	const creatorCardMotion = computed(() =>
		withMotionDelay(
			{
				initial: { opacity: 0.92 },
				enter: {
					opacity: 1,
					transition: {
						type: 'tween',
						duration: 220,
						ease: MOTION_TOKENS.ease.decelerate,
					},
				},
				leave: {
					opacity: 0,
					transition: {
						type: 'tween',
						duration: 150,
						ease: MOTION_TOKENS.ease.accelerate,
					},
				},
			},
			props.enterDelay,
		),
	)
	const priorityBadgeMotion = useMotionPreset('statusFeedback')
	const noteSectionMotion = useMotionPresetWithDelay('listItem', 72)
	const cardMotionPreset = useMotionPreset('card')
	const creatorInteractionMotion = computed<MotionVariants<string>>(() => ({
		...creatorCardMotion.value,
		hovered: {
			y: -1,
			scale: 1.003,
			transition: cardMotionPreset.value.hovered?.transition,
		},
		tapped: {
			y: 1,
			scale: 0.998,
			transition: cardMotionPreset.value.hovered?.transition,
		},
	}))

	const wrapperClass = computed(() => {
		if (props.disabled) return 'opacity-60 cursor-not-allowed'
		if (submitting.value) return 'border-primary/60 bg-primary/5'
		return 'hover:border-primary/40 hover:bg-elevated/70 hover:shadow-sm focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/20'
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
		const nextTitle = (debouncedTitle.value || title.value).trim()
		if (!nextTitle || submitting.value || props.disabled) return
		if (!props.spaceId) return
		const nextNote = note.value.trim()
		const nextPriority = priority.value ?? 'P1'
		let shouldRefocus = false

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
			shouldRefocus = true
		} catch (error) {
			console.error('内联创建任务失败:', error)
		} finally {
			submitting.value = false
			if (shouldRefocus && !props.disabled) {
				await nextTick()
				requestAnimationFrame(() => {
					const input = inputRef.value
					if (!input) return
					input.focus()
					const caret = input.value.length
					input.setSelectionRange(caret, caret)
				})
			}
		}
	}
</script>
