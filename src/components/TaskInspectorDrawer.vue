<template>
	<USlideover
		v-if="currentTask"
		v-model:open="isOpen"
		side="right"
		:ui="{
			content: 'w-[360px] sm:w-[400px] h-full flex flex-col bg-default/90 backdrop-blur-xl border-l border-default',
		}"
		:close="false">
		<template #content>
			<div class="flex flex-col h-full">
				<!-- Header -->
				<header class="px-4 py-3.5 border-b border-default/80 flex items-center justify-between gap-3 shrink-0">
					<div class="flex items-center gap-2.5 min-w-0 flex-1">
						<UBadge
							size="xs"
							color="primary"
							variant="soft">
							{{ currentSpaceLabel }}
						</UBadge>
						<div class="flex items-center gap-1.5 text-xs text-muted min-w-0">
							<UIcon
								name="i-lucide-folder"
								class="size-3.5 shrink-0" />
							<span class="truncate">
								{{ projectPathPlaceholder }}
							</span>
						</div>
					</div>

					<div class="flex items-center gap-1 shrink-0">
						<USelectMenu
							v-model="statusLocal"
							:items="statusOptions"
							value-key="value"
							label-key="label"
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
				<div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
					<!-- 标题 -->
					<section class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">标题</label>
						<UTextarea
							v-model="titleLocal"
							placeholder="输入任务标题…"
							autoresize
							:maxrows="3"
							size="sm"
							:ui="{
								rounded: 'rounded-xl',
							}"
							@blur="onTitleBlur" />
					</section>

					<!-- 属性 -->
					<section class="space-y-2.5">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">属性</label>
						<div class="grid grid-cols-2 gap-2.5">
							<button
								type="button"
								class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left">
								<div class="flex items-center gap-2.5">
									<UIcon
										name="i-lucide-flag"
										class="size-4 text-amber-400 shrink-0" />
									<div class="min-w-0 flex-1">
										<div class="text-[11px] text-muted mb-1">Priority</div>
										<div class="text-xs font-medium text-default">未设定</div>
									</div>
								</div>
							</button>

							<button
								type="button"
								class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left">
								<div class="flex items-center gap-2.5">
									<UIcon
										name="i-lucide-calendar"
										class="size-4 text-sky-400 shrink-0" />
									<div class="min-w-0 flex-1">
										<div class="text-[11px] text-muted mb-1">Due Date</div>
										<div class="text-xs font-medium text-default">未设定</div>
									</div>
								</div>
							</button>

							<button
								type="button"
								class="p-3 rounded-xl bg-elevated/50 border border-default/50 hover:bg-elevated/70 hover:border-default/70 transition-all text-left col-span-2">
								<div class="space-y-2">
									<div class="text-[11px] text-muted">Tags</div>
									<div class="flex flex-wrap gap-1.5">
										<UBadge
											color="neutral"
											variant="soft"
											size="xs">
											暂无标签
										</UBadge>
									</div>
								</div>
							</button>
						</div>
					</section>

					<!-- 备注 -->
					<section class="space-y-2">
						<label class="text-[11px] font-medium text-muted uppercase tracking-wide">备注</label>
						<UTextarea
							placeholder="记录一些背景信息、想法或链接…"
							:rows="4"
							size="sm"
							:ui="{
								rounded: 'rounded-xl',
							}" />
					</section>

					<!-- 时间线 -->
					<section class="space-y-2.5">
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
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

	import { updateTask } from '@/services/api/tasks'
	import { useTaskInspectorStore } from '@/stores/taskInspector'

	const store = useTaskInspectorStore()

	const currentTask = computed(() => store.task)

	const titleLocal = ref('')
	const statusLocal = ref<string | undefined>(undefined)

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

	const isOpen = computed({
		get: () => store.isOpen as boolean,
		set: (value) => {
			if (!value) {
				store.close()
			}
		},
	})

	function close() {
		store.close()
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
		statusLocal.value = t.status ?? undefined
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
