<template>
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="text-xs font-semibold text-muted uppercase tracking-widest">{{ t('inspector.note.label') }}</label>
			<UButton
				color="neutral"
				variant="soft"
				size="xs"
				:icon="isEditorVisible ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
				@click="onToggleClick">
				{{ isEditorVisible ? t('inspector.note.collapse') : t('inspector.note.expand') }}
			</UButton>
		</div>

		<div
			class="rounded-2xl border-2 bg-elevated/50 p-4 transition-[border-color] duration-180"
			:class="isEditorVisible || isAnimating ? 'border-emerald-300 cursor-default' : 'border-default/70 cursor-pointer'"
			@click="onCollapsedCardClick">
			<div
				v-show="!isEditorVisible"
				ref="previewRef"
				class="rounded-lg text-sm leading-relaxed outline-none"
				role="button"
				tabindex="0"
				@click.stop="expandEditor"
				@keydown.enter.prevent="expandEditor"
				@keydown.space.prevent="expandEditor">
				<p
					v-if="hasNoteContent"
					class="note-preview-text text-default">
					{{ previewText }}
				</p>
				<p
					v-else
					class="text-muted/55">
					{{ previewText }}
				</p>
			</div>
			<div
				v-show="isEditorVisible"
				ref="editorWrapRef"
				:class="['note-editor-wrap', { 'note-editor-wrap--animating': isAnimating }]">
				<UTextarea
					:id="textareaId"
					v-model="noteModel"
					:placeholder="resolvedPlaceholder"
					:rows="rows"
					size="sm"
					variant="none"
					:ui="{
						root: 'w-full',
						base: 'p-0 text-sm leading-relaxed bg-transparent border-none rounded-none resize-none overflow-y-auto overscroll-contain focus:ring-0 placeholder:text-muted/40',
					}"
					@focus="onNoteFocus"
					@compositionstart="props.interaction.onCompositionStart"
					@compositionend="props.interaction.onCompositionEnd"
					@wheel.stop
					@blur="onNoteBlur" />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { useMotion } from '@vueuse/motion'
	import { useElementSize } from '@vueuse/core'
	import { computed, nextTick, ref, watch } from 'vue'

	import type { DrawerTextInteractionHandlers } from '../types'

	const noteModel = defineModel<string>('note', { required: true })

	type Props = {
		interaction: DrawerTextInteractionHandlers
		placeholder?: string
		rows?: number
	}

	const props = withDefaults(defineProps<Props>(), {
		placeholder: undefined,
		rows: 6,
	})
	const { t } = useI18n({ useScope: 'global' })

	const isEditorVisible = ref(false)
	const isAnimating = ref(false)
	const textareaId = `drawer-note-${Math.random().toString(36).slice(2)}`
	const previewRef = ref<HTMLElement | null>(null)
	const editorWrapRef = ref<HTMLElement | null>(null)
	const previewHeightCache = ref(40)
	const editorExpandedMaxHeight = computed(() => Math.max(220, props.rows * 32 + 28))
	let collapseRafId = 0
	let motionTicket = 0

	const hasNoteContent = computed(() => noteModel.value.trim().length > 0)
	const resolvedPlaceholder = computed(() => props.placeholder ?? t('inspector.note.placeholder'))
	const previewText = computed(() => (hasNoteContent.value ? noteModel.value.trim() : resolvedPlaceholder.value))
	const { height: previewHeight } = useElementSize(previewRef)
	const editorCollapsedHeight = computed(() => Math.ceil(previewHeightCache.value))

	watch(
		previewHeight,
		(value) => {
			if (value > 0) {
				previewHeightCache.value = value
			}
		},
		{ immediate: true },
	)

	const noteEditorVariants = computed(() => {
		return {
			initial: {
				maxHeight: editorCollapsedHeight.value,
			},
			enter: {
				maxHeight: editorExpandedMaxHeight.value,
				transition: {
					duration: 220,
				},
			},
			leave: {
				maxHeight: editorCollapsedHeight.value,
				transition: {
					duration: 180,
				},
			},
		}
	})

	const noteEditorMotion = useMotion(editorWrapRef, noteEditorVariants, {
		syncVariants: false,
		lifeCycleHooks: false,
		eventListeners: false,
		visibilityHooks: false,
	})

	function getTextareaElement(): HTMLTextAreaElement | null {
		const node = document.getElementById(textareaId)
		return node instanceof HTMLTextAreaElement ? node : null
	}

	async function expandEditor() {
		if (isAnimating.value) return
		const ticket = ++motionTicket

		if (!isEditorVisible.value) {
			isAnimating.value = true
			isEditorVisible.value = true
			await nextTick()
			noteEditorMotion.set('initial')
			await noteEditorMotion.apply('enter')
			isAnimating.value = false
			if (ticket !== motionTicket) return
		}

		const textarea = getTextareaElement()
		if (textarea) {
			textarea.focus()
		}
	}

	async function collapseEditor() {
		if (!isEditorVisible.value || isAnimating.value) return
		isAnimating.value = true
		const ticket = ++motionTicket
		await noteEditorMotion.apply('leave')
		isAnimating.value = false
		if (ticket !== motionTicket) return
		isEditorVisible.value = false
	}

	function queueCollapseNextFrame() {
		if (collapseRafId) {
			cancelAnimationFrame(collapseRafId)
		}
		collapseRafId = requestAnimationFrame(() => {
			collapseRafId = 0
			void collapseEditor()
		})
	}

	function onToggleClick() {
		if (!isEditorVisible.value) {
			void expandEditor()
			return
		}

		const textarea = getTextareaElement()
		if (textarea && document.activeElement === textarea) {
			textarea.blur()
		}
		queueCollapseNextFrame()
	}

	function onCollapsedCardClick() {
		if (isEditorVisible.value) return
		void expandEditor()
	}

	function onNoteFocus() {
		props.interaction.onFocus()
	}

	function onNoteBlur() {
		props.interaction.onBlur()
		queueCollapseNextFrame()
	}
</script>

<style scoped>
	.note-preview-text {
		display: -webkit-box;
		overflow: hidden;
		white-space: pre-wrap;
		word-break: break-word;
		overflow-wrap: anywhere;
		line-clamp: 3;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
	}

	.note-editor-wrap {
		overflow: visible;
	}

	.note-editor-wrap--animating {
		overflow: hidden;
		will-change: max-height;
	}
</style>
