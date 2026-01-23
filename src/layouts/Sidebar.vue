<template>
	<aside class="w-64 shrink-0 border-r border-default flex flex-col bg-default/80 backdrop-blur-xl">
		<!-- 顶部：Brand + Space Segmented Control -->
		<div class="px-3 pt-3 pb-2 border-b border-default/80">
			<div class="mb-2">
				<BrandLogo />
			</div>
			<div class="rounded-xl bg-elevated/70 border border-default/80 p-0.5 flex gap-0.5">
				<button
					v-for="s in spaces"
					:key="s.id"
					type="button"
					class="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-[9px] text-[11px] font-medium transition-all duration-150"
					:class="spaceValue === s.id ? 'bg-default text-default shadow-sm' : 'text-muted hover:text-default hover:bg-default/40' "
					@click="onSpaceClick(s.id)">
					<UIcon
						:name="s.icon"
						class="size-3.5"
						:class="spaceValue === s.id ? s.activeIconClass : s.iconClass" />
					<span>{{ s.label }}</span>
				</button>
			</div>
		</div>

		<!-- 中间滚动区：Execution Zone + Projects + Library -->
		<div class="flex-1 overflow-y-auto px-3 py-3 space-y-4">
			<!-- Execution Zone -->
			<section>
				<div class="px-1.5 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Execution</div>
				<nav class="flex flex-col gap-0.5">
					<RouterLink
						v-for="item in executionNav"
						:key="item.to"
						:to="item.to"
						class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
						:class="currentPath === item.to ? 'bg-elevated text-default' : ''">
						<UIcon
							:name="item.icon"
							:class="item.iconColor" />
						<span>{{ item.label }}</span>
					</RouterLink>
				</nav>
			</section>

			<!-- Project Tree -->
			<section>
				<div class="px-1.5 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Projects</div>
				<div class="space-y-0.5">
					<div
						v-if="projectsTree.length === 0"
						class="text-[12px] text-muted px-2.5 py-1.5 rounded-md bg-elevated/60 border border-dashed border-default/70">
						当前 Space 暂无项目
					</div>
					<button
						v-for="node in projectsTree"
						:key="node.id"
						type="button"
						class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
						:style="{ paddingLeft: `${10 + node.depth * 12}px` }">
						<UIcon
							:name="node.icon"
							class="size-3.5"
							:class="node.iconClass" />
						<span class="truncate">{{ node.name }}</span>
					</button>
				</div>
			</section>

			<!-- Library：Finish List + Snippets + Vault + Notes + Stats + Logs -->
			<section>
				<div class="px-1.5 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Library</div>
				<nav class="flex flex-col gap-0.5">
					<RouterLink
						v-for="item in libraryNav"
						:key="item.to"
						:to="item.to"
						class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-muted hover:bg-elevated hover:text-default transition-all duration-150"
						:class="currentPath === item.to ? 'bg-elevated text-default' : ''">
						<UIcon
							:name="item.icon"
							:class="item.iconColor" />
						<span>{{ item.label }}</span>
					</RouterLink>
				</nav>
			</section>
		</div>

		<!-- 底部：User Capsule -->
		<div class="p-3 border-t border-default/80 bg-default/80">
			<div class="pt-1.5">
				<UserCard />
			</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useRoute } from 'vue-router'

	import BrandLogo from '@/components/BrandLogo.vue'
	import UserCard from '@/components/UserCard.vue'
	import { useProjectsStore } from '@/stores/projects'

	const props = defineProps<{
		space?: string | null
	}>()

	const emit = defineEmits<{
		'update:space': [spaceId: string]
	}>()

	const route = useRoute()
	const currentPath = computed(() => route.path)

	const spaceValue = computed(() => props.space ?? 'work')

	const spaces = [
		{
			id: 'work',
			label: 'Work',
			icon: 'i-lucide-briefcase',
			iconClass: 'text-blue-500/70',
			activeIconClass: 'text-blue-500',
		},
		{
			id: 'personal',
			label: 'Personal',
			icon: 'i-lucide-user',
			iconClass: 'text-purple-500/70',
			activeIconClass: 'text-purple-500',
		},
		{
			id: 'study',
			label: 'Study',
			icon: 'i-lucide-book-open',
			iconClass: 'text-green-500/70',
			activeIconClass: 'text-green-500',
		},
	]

	function onSpaceClick(id: string) {
		if (id === spaceValue.value) return
		emit('update:space', id)
	}

	const executionNav = [
		{ to: '/all-tasks', label: 'All Tasks', icon: 'i-lucide-list-checks', iconColor: 'text-pink-500' },
	]

	const libraryNav = [
		{ to: '/finish-list', label: 'Finish List', icon: 'i-lucide-check-circle', iconColor: 'text-green-500' },
		{ to: '/stats', label: 'Stats', icon: 'i-lucide-bar-chart-3', iconColor: 'text-blue-500' },
		{ to: '/logs', label: 'Logs', icon: 'i-lucide-scroll-text', iconColor: 'text-orange-500' },
		{ to: '/snippets', label: 'Snippets', icon: 'i-lucide-code', iconColor: 'text-cyan-500' },
		{ to: '/vault', label: 'Vault', icon: 'i-lucide-lock', iconColor: 'text-yellow-500' },
		{ to: '/notes', label: 'Notes', icon: 'i-lucide-notebook', iconColor: 'text-pink-500' },
		{ to: '/diary', label: 'Diary', icon: 'i-lucide-book-open-text', iconColor: 'text-indigo-500' },
		{ to: '/toolbox', label: 'Toolbox', icon: 'i-lucide-wrench', iconColor: 'text-gray-500' },
	]

	const projectsStore = useProjectsStore()

	type ProjectNode = {
		id: string
		name: string
		depth: number
		icon: string
		iconClass: string
	}

	const projectsTree = computed<ProjectNode[]>(() => {
		const spaceId = spaceValue.value
		const list = projectsStore.getProjectsOfSpace(spaceId)
		if (!list.length) return []

		const byParent = new Map<string | null, typeof list>()
		for (const p of list) {
			const key = p.parent_id
			const bucket = byParent.get(key) ?? []
			bucket.push(p)
			byParent.set(key, bucket)
		}

		const out: ProjectNode[] = []

		function walk(parentId: string | null, depth: number) {
			const children = byParent.get(parentId)
			if (!children) return
			for (const p of children) {
				out.push({
					id: p.id,
					name: p.name,
					depth,
					icon: depth === 0 ? 'i-lucide-folder' : 'i-lucide-circle',
					iconClass: depth === 0 ? 'text-amber-500' : 'text-muted',
				})
				walk(p.id, depth + 1)
			}
		}

		walk(null, 0)
		return out
	})
</script>
