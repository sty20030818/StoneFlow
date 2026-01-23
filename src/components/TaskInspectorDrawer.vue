<template>
	<USlideover
		v-if="currentTask"
		:model-value="isOpen"
		side="right"
		:ui="slideoverUi"
		@update:model-value="onToggle">
		<template #backdrop>
			<div class="fixed inset-0 bg-black/30 backdrop-blur-sm" />
		</template>

		<div class="flex flex-col h-full">
			<!-- Header -->
			<header class="px-4 py-3 border-b border-default flex items-center justify-between gap-3">
				<div class="flex items-center gap-2 min-w-0">
					<UBadge
						size="xs"
						color="primary"
						variant="soft">
						{{ currentSpaceLabel }}
					</UBadge>
					<div class="flex items-center gap-1 text-xs text-muted">
						<UIcon
							name="i-lucide-folder"
							class="size-3.5 text-muted" />
						<span class="truncate">
							{{ projectPathPlaceholder }}
						</span>
					</div>
				</div>

				<div class="flex items-center gap-1.5">
					<USelectMenu
						v-model="statusLocal"
						:options="statusOptions"
						size="xs"
						color="primary"
						variant="soft"
						@update:model-value="onStatusChange" />

					<UButton
						color="neutral"
						variant="ghost"
						icon="i-lucide-more-horizontal"
						size="xs" />

					<UButton
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						size="xs"
						@click="close">
						<span class="sr-only">关闭</span>
					</UButton>
				</div>
			</header>

			<!-- Body -->
			<div class="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
				<section class="space-y-2">
					<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标题</label>
					<UTextarea
						v-model="titleLocal"
						placeholder="输入任务标题…"
						autoresize
						:maxrows="3"
						@blur="onTitleBlur" />
				</section>

				<section class="space-y-2">
					<label class="text-[11px] font-medium text-muted uppercase tracking-wide">属性</label>
					<div class="grid grid-cols-2 gap-2">
						<UCard class="py-2 px-3 bg-elevated/60 border-default/70">
							<div class="text-[11px] text-muted mb-0.5">Priority</div>
							<div class="flex items-center gap-1.5">
								<UIcon
									name="i-lucide-flag"
									class="size-3 text-amber-400" />
								<span class="text-xs text-default">未设定</span>
							</div>
						</UCard>

						<UCard class="py-2 px-3 bg-elevated/60 border-default/70">
							<div class="text-[11px] text-muted mb-0.5">Due Date</div>
							<div class="flex items-center gap-1.5">
								<UIcon
									name="i-lucide-calendar"
									class="size-3 text-sky-400" />
								<span class="text-xs text-default">未设定</span>
							</div>
						</UCard>

						<UCard class="py-2 px-3 bg-elevated/60 border-default/70 col-span-2">
							<div class="text-[11px] text-muted mb-1">Tags</div>
							<div class="flex flex-wrap gap-1.5">
								<UBadge
									color="neutral"
									variant="soft"
									size="xs">
									暂无标签
								</UBadge>
							</div>
						</UCard>
					</div>
				</section>

				<section class="space-y-2">
					<label class="text-[11px] font-medium text-muted uppercase tracking-wide">备注</label>
					<UTextarea
						placeholder="记录一些背景信息、想法或链接…"
						:rows="4" />
				</section>

				<section class="space-y-2">
					<div class="flex items-center justify-between">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">时间线</label>
						<UBadge
							size="xs"
							color="neutral"
							variant="soft">
							mock 数据
						</UBadge>
					</div>

					<UTimeline :items="timelineItems" />
				</section>
			</div>
		</div>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

	import { updateTask } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'

	const store = useTaskInspectorStore()

	const isOpen = computed(() => store.isOpen as boolean)
	const currentTask = computed(() => store.task)

	const titleLocal = ref('')
	const statusLocal = ref<string | null>(null)

	const statusOptions = [
		{ label: '待办', value: 'todo' },
		{ label: '进行中', value: 'doing' },
		{ label: '已完成', value: 'done' },
	]

	const currentSpaceLabel = computed(() => {
		const sid = currentTask.value?.space_id
		if (!sid) return 'Unknown Space'
		const map: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return map[sid] ?? sid
	})

	const projectPathPlaceholder = computed(() => {
		return 'Project / 子项目（占位）'
	})

	const timelineItems = computed(() => {
		const t = currentTask.value
		if (!t) return []

		const created = new Date(t.created_at)
		const started = t.started_at ? new Date(t.started_at) : null
		const completed = t.completed_at ? new Date(t.completed_at) : null

		const items = [
			{
				label: '创建',
				content: created.toLocaleString(),
				icon: 'i-lucide-circle-dot',
			},
		]

		if (started) {
			items.push({
				label: '开始',
				content: started.toLocaleString(),
				icon: 'i-lucide-play',
			})
		}

		if (completed) {
			items.push({
				label: '完成',
				content: completed.toLocaleString(),
				icon: 'i-lucide-check-circle-2',
			})
		}

		return items
	})

	const slideoverUi = {
		base: 'fixed inset-y-0 right-0 flex max-w-full outline-none',
		width: 'w-[360px] sm:w-[400px]',
		overlay: 'pointer-events-auto',
		container: 'pointer-events-auto',
		background: 'bg-default/90 backdrop-blur-xl border-l border-default',
	}

	function close() {
		store.close()
	}

	function onToggle(value: boolean) {
		if (!value) {
			close()
		}
	}

	async function onTitleBlur() {
		if (!currentTask.value) return
		const nextTitle = titleLocal.value.trim()
		if (!nextTitle || nextTitle === currentTask.value.title) return
		await updateTask(currentTask.value.id, { title: nextTitle })
		store.patchTask({ title: nextTitle })
	}

	async function onStatusChange(value: unknown) {
		const record = value as { value?: string } | null
		const next = typeof value === 'string' ? value : record?.value
		if (!currentTask.value || !next || next === currentTask.value.status) return
		await updateTask(currentTask.value.id, { status: next })
		store.patchTask({ status: next })
	}

	function syncFromTask() {
		const t = currentTask.value
		if (!t) return
		titleLocal.value = t.title
		statusLocal.value = t.status ?? 'todo'
	}

	watch(
		() => currentTask.value,
		() => {
			syncFromTask()
		},
		{ immediate: true },
	)

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen.value) {
			e.preventDefault()
			close()
		}
	}

	onMounted(() => {
		window.addEventListener('keydown', onKeydown)
	})

	onUnmounted(() => {
		window.removeEventListener('keydown', onKeydown)
	})
</script>
