<template>
	<aside class="w-60 shrink-0 border-r border-default flex flex-col">
		<!-- 顶部固定：Brand Logo -->
		<div class="p-3 pb-0">
			<BrandLogo />
		</div>

		<!-- 中间滚动区：导航列表 -->
		<div class="flex-1 overflow-y-auto p-3 space-y-4">
			<!-- Workspace -->
			<div>
				<div class="px-2 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Workspace</div>
				<nav class="flex flex-col gap-0.5">
					<RouterLink
						v-for="item in workspaceNav"
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
			</div>

			<!-- Review -->
			<div>
				<div class="px-2 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Review</div>
				<nav class="flex flex-col gap-0.5">
					<RouterLink
						v-for="item in reviewNav"
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
			</div>

			<!-- Assets Library -->
			<div>
				<div class="px-2 text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">Assets Library</div>
				<nav class="flex flex-col gap-0.5">
					<RouterLink
						v-for="item in assetsNav"
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
			</div>
		</div>

		<!-- 底部固定：User Card -->
		<div class="p-3 pt-0 border-t border-default">
			<div class="pt-3">
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

	const route = useRoute()
	const currentPath = computed(() => route.path)

	const workspaceNav = [
		{ to: '/dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard', iconColor: 'text-primary' },
		{ to: '/all-tasks', label: 'All Tasks', icon: 'i-lucide-list-checks', iconColor: 'text-pink-500' },
		{ to: '/space/work', label: 'Work', icon: 'i-lucide-briefcase', iconColor: 'text-blue-500' },
		{ to: '/space/personal', label: 'Personal', icon: 'i-lucide-user', iconColor: 'text-purple-500' },
		{ to: '/space/study', label: 'Study', icon: 'i-lucide-book-open', iconColor: 'text-green-500' },
	]

	const reviewNav = [
		{ to: '/finish-list', label: 'Finish List', icon: 'i-lucide-check-circle', iconColor: 'text-green-500' },
		{ to: '/stats', label: 'Stats', icon: 'i-lucide-bar-chart-3', iconColor: 'text-blue-500' },
		{ to: '/logs', label: 'Logs', icon: 'i-lucide-scroll-text', iconColor: 'text-orange-500' },
	]

	const assetsNav = [
		{ to: '/snippets', label: 'Snippets', icon: 'i-lucide-code', iconColor: 'text-cyan-500' },
		{ to: '/vault', label: 'Vault', icon: 'i-lucide-lock', iconColor: 'text-yellow-500' },
		{ to: '/notes', label: 'Notes', icon: 'i-lucide-notebook', iconColor: 'text-pink-500' },
		{ to: '/toolbox', label: 'Toolbox', icon: 'i-lucide-wrench', iconColor: 'text-gray-500' },
	]
</script>
