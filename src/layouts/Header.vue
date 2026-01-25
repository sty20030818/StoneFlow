<template>
	<header
		class="h-16 shrink-0 px-6 flex items-center justify-between sticky top-0 bg-default/85 backdrop-blur-xl border-b border-default/80">
		<!-- 左侧：面包屑 -->
		<div class="flex items-center gap-2 min-w-0 flex-1">
			<!-- Space Pill（第一个节点：icon + space，可点击） -->
			<RouterLink
				v-if="currentSpaceLabel && currentSpaceIcon"
				to="/all-tasks"
				class="px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 bg-elevated/70 border border-default/70 hover:bg-elevated/90 transition-colors">
				<UIcon
					:name="currentSpaceIcon"
					:class="currentSpaceIconClass"
					class="size-3.5 shrink-0" />
				<span class="text-default">{{ currentSpaceLabel }}</span>
			</RouterLink>
			<!-- 面包屑路径（只显示 project，不包含 space） -->
			<template v-if="breadcrumbItems.length > 0">
				<UIcon
					name="i-lucide-chevron-right"
					class="size-3.5 text-muted shrink-0" />
				<div class="flex items-center gap-2 min-w-0">
					<template
						v-for="(item, index) in breadcrumbItems"
						:key="index">
						<UIcon
							v-if="index > 0"
							name="i-lucide-chevron-right"
							class="size-3.5 text-muted shrink-0" />
						<RouterLink
							v-if="item.to"
							:to="item.to"
							class="text-sm font-semibold text-default hover:text-primary transition-colors truncate">
							{{ item.label }}
						</RouterLink>
						<span
							v-else
							class="text-sm font-semibold text-default truncate">
							{{ item.label }}
						</span>
					</template>
				</div>
			</template>
		</div>

		<!-- 右侧：搜索框胶囊 + 操作按钮 -->
		<div class="flex items-center gap-2 shrink-0">
			<!-- 搜索框（胶囊样式） -->
			<div class="relative shrink-0">
				<UInput
					v-model="searchQuery"
					placeholder="搜索任务..."
					icon="i-lucide-search"
					size="sm"
					:ui="{
						width: 'w-64',
					}"
					class="rounded-full! [&>div]:rounded-full! [&_input]:rounded-full!" />
			</div>

			<!-- Filter/Sort 独立按钮 -->
			<template v-if="isWorkspacePage">
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-filter">
					<span class="ml-1 text-[11px]">Filter</span>
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-arrow-up-down">
					<span class="ml-1 text-[11px]">Sort</span>
				</UButton>
			</template>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed, inject, ref, type ComputedRef } from 'vue'
	import { useRoute } from 'vue-router'

	import type { ProjectDto } from '@/services/api/projects'
	import { useProjectsStore } from '@/stores/projects'
	import { useSettingsStore } from '@/stores/settings'

	const route = useRoute()
	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()

	const searchQuery = ref('')

	const isWorkspacePage = computed(() => {
		return route.path.startsWith('/space/') || route.path === '/all-tasks'
	})

	const currentSpaceLabel = computed(() => {
		if (!settingsStore.loaded) return null
		const spaceId = settingsStore.settings.activeSpaceId ?? 'work'
		const labelMap: Record<string, string> = {
			work: 'Work',
			personal: 'Personal',
			study: 'Study',
		}
		return labelMap[spaceId] ?? spaceId
	})

	const currentSpaceIcon = computed(() => {
		if (!settingsStore.loaded) return null
		const spaceId = settingsStore.settings.activeSpaceId ?? 'work'
		const iconMap: Record<string, string> = {
			work: 'i-lucide-briefcase',
			personal: 'i-lucide-user',
			study: 'i-lucide-book-open',
		}
		return iconMap[spaceId] ?? 'i-lucide-folder'
	})

	const currentSpaceIconClass = computed(() => {
		if (!settingsStore.loaded) return ''
		const spaceId = settingsStore.settings.activeSpaceId ?? 'work'
		const classMap: Record<string, string> = {
			work: 'text-blue-500',
			personal: 'text-purple-500',
			study: 'text-green-500',
		}
		return classMap[spaceId] ?? 'text-gray-500'
	})

	// 从 inject 获取 workspace 页面的 breadcrumbItems
	const workspaceBreadcrumbItems = inject<ComputedRef<{ label: string; to?: string }[]>>('workspaceBreadcrumbItems', computed(() => []))

	const breadcrumbItems = computed(() => {
		// 优先使用 inject 的 breadcrumbItems（来自 workspace 页面），但需要过滤掉 Space 相关的项
		if (workspaceBreadcrumbItems.value.length > 0) {
			// 过滤掉 'Space' 和 space label（如 'Work'），只保留 project 路径
			return workspaceBreadcrumbItems.value.filter((item) => {
				const label = item.label.toLowerCase()
				return label !== 'space' && label !== 'work' && label !== 'personal' && label !== 'study'
			})
		}
		// 如果没有传入，根据路由自动生成（只包含 project，不包含 space）
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			const base: { label: string; to?: string }[] = []
			const pid = route.query.project
			const list = projectsStore.getProjectsOfSpace(spaceId)
			if (typeof pid === 'string') {
				const path = projectPath(list, pid)
				if (path.length) {
					for (let i = 0; i < path.length; i++) {
						const p = path[i]
						const isLast = i === path.length - 1
						base.push({ label: p.name, ...(isLast ? {} : { to: `/space/${spaceId}?project=${p.id}` }) })
					}
				}
			} else {
				// 默认 project
				const defaultProject = list.find((p) => p.id.endsWith('_default'))
				if (defaultProject) {
					base.push({ label: defaultProject.name })
				}
			}
			return base
		}
		return []
	})

	/** 从 project 列表按 parent_id 回溯，得到 root → … → current 的层级路径 */
	function projectPath(list: ProjectDto[], targetId: string): ProjectDto[] {
		const byId = new Map(list.map((p) => [p.id, p]))
		const out: ProjectDto[] = []
		let curr: ProjectDto | undefined = byId.get(targetId)
		while (curr) {
			out.unshift(curr)
			curr = curr.parent_id ? byId.get(curr.parent_id) : undefined
		}
		return out
	}
</script>
