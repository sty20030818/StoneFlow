<template>
	<div
		v-if="project"
		class="mb-8 bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group z-0">
		<!-- 彩色模糊背景 -->
		<div
			class="absolute -top-10 -right-10 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl opacity-60"></div>
		<div class="absolute top-20 right-20 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl opacity-60"></div>

		<div class="relative z-0 flex justify-between items-start">
			<div class="max-w-2xl">
				<div class="flex items-center gap-3 mb-3">
					<h1 class="text-3xl font-black text-slate-900 tracking-tight">{{ project.name }}</h1>
					<div class="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
				</div>
				<p
					v-if="project.note"
					class="text-slate-500 font-medium text-sm leading-relaxed">
					{{ project.note }}
				</p>

				<!-- 元信息区域（可选，如果需要显示头像、截止日期等） -->
				<!-- <div class="flex gap-4 mt-6">
					<div class="flex -space-x-2">
						<img
							class="w-7 h-7 rounded-full border-2 border-white"
							src="https://ui-avatars.com/api/?name=SF&background=0F172A&color=fff" />
						<div
							class="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
							+2
						</div>
					</div>
					<div class="h-7 w-px bg-slate-100"></div>
					<div class="flex items-center gap-1.5 text-xs font-bold text-slate-400">
						<UIcon
							name="i-lucide-calendar-check"
							class="text-brand-500" />
						<span>Due May 30</span>
					</div>
				</div> -->
			</div>

			<!-- 圆形进度条 -->
			<div class="relative w-20 h-20 flex items-center justify-center">
				<svg class="transform -rotate-90 w-20 h-20">
					<circle
						cx="40"
						cy="40"
						r="32"
						stroke="currentColor"
						stroke-width="6"
						fill="transparent"
						class="text-slate-100" />
					<circle
						cx="40"
						cy="40"
						r="32"
						stroke="currentColor"
						stroke-width="6"
						fill="transparent"
						:stroke-dasharray="32 * 2 * 3.14"
						:stroke-dashoffset="32 * 2 * 3.14 * (1 - progressPercent / 100)"
						class="text-blue-600"
						stroke-linecap="round" />
				</svg>
				<div class="absolute inset-0 flex flex-col items-center justify-center">
					<span class="text-sm font-black text-slate-800">{{ progressPercent }}%</span>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	import type { ProjectDto } from '@/services/api/projects'

	defineProps<{
		project: ProjectDto | null
		progressPercent: number
		totalTasks?: number
	}>()
</script>
