<template>
	<aside class="w-60 shrink-0 border-r border-default px-3 py-3 flex flex-col gap-2 overflow-y-auto">
		<!-- Workspace -->
		<div>
			<div class="px-2 text-xs font-medium text-muted mb-2">Workspace</div>
			<nav class="flex flex-col gap-0.5">
				<RouterLink
					v-for="item in workspaceNav"
					:key="item.to"
					:to="item.to"
					class="px-2 py-2 rounded-md text-sm hover:bg-elevated transition flex items-center gap-2"
					:class="currentPath === item.to ? 'bg-elevated text-default' : 'text-muted'">
					<UIcon
						:name="item.icon"
						:class="item.iconColor" />
					<span>{{ item.label }}</span>
				</RouterLink>
			</nav>
		</div>

		<!-- Review -->
		<div>
			<div class="px-2 text-xs font-medium text-muted mb-2">Review</div>
			<nav class="flex flex-col gap-0.5">
				<RouterLink
					v-for="item in reviewNav"
					:key="item.to"
					:to="item.to"
					class="px-2 py-2 rounded-md text-sm hover:bg-elevated transition flex items-center gap-2"
					:class="currentPath === item.to ? 'bg-elevated text-default' : 'text-muted'">
					<UIcon
						:name="item.icon"
						:class="item.iconColor" />
					<span>{{ item.label }}</span>
				</RouterLink>
			</nav>
		</div>

		<!-- Assets Library -->
		<div>
			<div class="px-2 text-xs font-medium text-muted mb-2">Assets Library</div>
			<nav class="flex flex-col gap-0.5">
				<RouterLink
					v-for="item in assetsNav"
					:key="item.to"
					:to="item.to"
					class="px-2 py-2 rounded-md text-sm hover:bg-elevated transition flex items-center gap-2"
					:class="currentPath === item.to ? 'bg-elevated text-default' : 'text-muted'">
					<UIcon
						:name="item.icon"
						:class="item.iconColor" />
					<span>{{ item.label }}</span>
				</RouterLink>
			</nav>
		</div>

		<!-- Settings -->
		<div class="mt-auto">
			<RouterLink
				to="/settings"
				class="px-2 py-2 rounded-md text-sm hover:bg-elevated transition flex items-center gap-2"
				:class="currentPath === '/settings' ? 'bg-elevated text-default' : 'text-muted'">
				<UIcon
					name="i-lucide-settings"
					class="text-gray-500" />
				<span>Settings</span>
			</RouterLink>
			<div class="px-2 pt-3 text-xs text-muted">StoneFlow · M0</div>
		</div>
	</aside>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useRoute } from 'vue-router'

	const route = useRoute()
	const currentPath = computed(() => route.path)

	const workspaceNav = [
		{ to: '/dashboard', label: 'Dashboard', icon: 'i-lucide-layout-dashboard', iconColor: 'text-primary' },
		{ to: '/all-tasks', label: 'All Tasks', icon: 'i-lucide-list-checks', iconColor: 'text-gray-500' },
		{ to: '/work', label: 'Work', icon: 'i-lucide-briefcase', iconColor: 'text-blue-500' },
		{ to: '/personal', label: 'Personal', icon: 'i-lucide-user', iconColor: 'text-purple-500' },
		{ to: '/study', label: 'Study', icon: 'i-lucide-book-open', iconColor: 'text-green-500' },
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
