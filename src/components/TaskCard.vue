<template>
	<!-- Doing 状态：左侧蓝色边框，大卡片 -->
	<div
		v-if="task.status === 'doing'"
		class="bg-default rounded-2xl p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group border-t border-b border-r border-default/80 border-l-4 border-l-blue-500"
		@click="$emit('click', task)">
		<div class="flex gap-4">
			<!-- 左侧：已选中的圆形复选框 -->
			<div
				@click.stop="$emit('complete', task.id)"
				class="mt-1 w-6 h-6 shrink-0 rounded-full border-2 border-blue-500 flex items-center justify-center text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
				<div class="w-3 h-3 rounded-full bg-blue-500"></div>
			</div>

			<!-- 右侧：内容堆叠 -->
			<div class="flex-1 min-w-0">
				<!-- 第一行：标题和优先级 -->
				<div class="flex justify-between items-start mb-2">
					<h4 class="text-base font-bold text-default leading-tight group-hover:text-blue-600 transition-colors">
						{{ task.title }}
					</h4>
					<span
						class="ml-2 px-2 py-1 rounded-lg text-xs font-bold shrink-0"
						:class="getPriorityClass(task.priority)">
						{{ task.priority || 'P1' }}
					</span>
				</div>

				<!-- 第二行：Note -->
				<p
					v-if="task.note"
					class="text-sm text-muted font-medium line-clamp-2 mb-3 leading-relaxed">
					{{ task.note }}
				</p>

				<!-- 第三行：Meta Tags -->
				<div class="flex items-center flex-wrap gap-2 mt-auto pt-2 border-t border-default/50">
					<span
						v-if="showSpaceLabel"
						class="px-2 py-1 rounded-md bg-elevated text-muted text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
						<UIcon
							name="i-lucide-folder"
							class="size-3" />
						{{ spaceLabel(task.space_id) }}
					</span>
					<span
						v-for="tag in task.tags"
						:key="tag"
						class="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
						#{{ tag }}
					</span>
					<div
						v-if="showTime && task.completed_at"
						class="ml-auto flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
						<UIcon
							name="i-lucide-clock"
							class="size-3" />
						<span class="text-xs font-bold">{{ formatTime(task.completed_at) }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Todo 状态：简洁设计，未选中复选框 -->
	<div
		v-else-if="task.status === 'todo'"
		class="bg-default rounded-2xl p-4 border border-default/80 hover:border-default hover:shadow-md transition-all cursor-pointer group flex gap-4 items-start"
		@click="$emit('click', task)">
		<!-- 复选框 -->
		<div
			@click.stop="$emit('complete', task.id)"
			class="mt-1 w-6 h-6 rounded-full border-2 border-default/60 hover:border-default transition-colors shrink-0 cursor-pointer"></div>

		<div class="flex-1 min-w-0">
			<div class="flex justify-between items-start">
				<span class="font-bold text-default text-base group-hover:text-default transition-colors">
					{{ task.title }}
				</span>
				<span
					class="text-xs font-bold bg-elevated px-2 py-1 rounded-lg shrink-0"
					:class="getPriorityTextClass(task.priority)">
					{{ task.priority || 'P1' }}
				</span>
			</div>

			<p
				v-if="task.note"
				class="text-xs text-muted mt-1 line-clamp-1">
				{{ task.note }}
			</p>

			<div
				class="flex items-center gap-2 mt-3"
				v-if="showSpaceLabel || task.tags.length > 0 || (showTime && task.completed_at)">
				<span
					v-if="showSpaceLabel"
					class="text-[10px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
					{{ spaceLabel(task.space_id) }}
				</span>
				<span
					v-for="tag in task.tags"
					:key="tag"
					class="text-[10px] font-bold text-muted bg-elevated px-1.5 py-0.5 rounded">
					#{{ tag }}
				</span>
				<span
					v-if="showTime && task.completed_at"
					class="text-[10px] font-bold text-muted ml-auto">
					{{ formatTime(task.completed_at) }}
				</span>
			</div>
		</div>
	</div>

	<!-- Done 状态：最简洁，绿色勾选，删除线 -->
	<div
		v-else-if="task.status === 'done'"
		class="flex items-center gap-4 p-4 bg-elevated rounded-2xl border border-transparent hover:border-default/80 transition-colors opacity-50 hover:opacity-100"
		@click="$emit('click', task)">
		<div class="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-green-100 text-green-600">
			<UIcon
				name="i-lucide-check"
				class="size-3" />
		</div>
		<span class="text-muted font-medium line-through">{{ task.title }}</span>
		<div
			v-if="showTime && task.completed_at"
			class="ml-auto text-xs text-muted shrink-0">
			{{ formatTime(task.completed_at) }}
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { TaskDto } from '@/services/api/tasks'

	const props = defineProps<{
		task: TaskDto
		showCompleteButton?: boolean
		showTime?: boolean
		showSpaceLabel?: boolean
	}>()

	defineEmits<{
		click: [task: TaskDto]
		complete: [taskId: string]
	}>()

	function spaceLabel(spaceId: string): string {
		const labels: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return labels[spaceId] ?? spaceId
	}

	function formatTime(timestamp: number): string {
		const date = new Date(timestamp)
		const now = new Date()
		const diff = now.getTime() - date.getTime()
		const days = Math.floor(diff / (1000 * 60 * 60 * 24))

		if (days === 0) return 'Today'
		if (days === 1) return 'Yesterday'
		if (days < 7) return `${days} days ago`
		return date.toLocaleDateString()
	}

	function getPriorityClass(priority: string | undefined): string {
		const p = priority || 'P1'
		if (p === 'P0') return 'bg-red-100 text-red-600'
		if (p === 'P2') return 'bg-blue-100 text-blue-600'
		return 'bg-amber-100 text-amber-600' // P1 default
	}

	function getPriorityTextClass(priority: string | undefined): string {
		const p = priority || 'P1'
		if (p === 'P0') return 'text-red-600'
		if (p === 'P2') return 'text-blue-600'
		return 'text-muted' // P1 default
	}
</script>

