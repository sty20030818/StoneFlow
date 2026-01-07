<template>
	<!--
    Nuxt UI v4（Vue 项目）建议用 UApp 包裹根节点，
    否则 toast / tooltip / modal 等全局能力可能不可用。
  -->
	<UApp :toaster="{ position: 'bottom-right', duration: 3000, max: 5 }">
		<AppShell>
			<RouterView />
		</AppShell>

		<!-- 命令面板 -->
		<UModal
			v-model:open="commandPaletteOpen"
			:ui="{ content: 'p-0' }">
			<template #content>
				<UCommandPalette
					:groups="commandGroups"
					placeholder="搜索页面或操作..."
					class="h-80"
					@update:model-value="onCommandSelect" />
			</template>
		</UModal>
	</UApp>
</template>

<script setup lang="ts">
	import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
	import { useRouter } from 'vue-router'

	import type { CommandPaletteItem } from '@nuxt/ui'

	import AppShell from './layouts/AppShell.vue'

	const router = useRouter()
	const commandPaletteOpen = ref(false)

	// 定义命令组
	const commandGroups = computed(() => [
		{
			id: 'workspace',
			label: 'Workspace',
			items: [
				{ label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
				{ label: 'All Tasks', icon: 'i-lucide-list-checks', to: '/all-tasks' },
				{ label: 'Work', icon: 'i-lucide-briefcase', to: '/work' },
				{ label: 'Personal', icon: 'i-lucide-user', to: '/personal' },
				{ label: 'Study', icon: 'i-lucide-book-open', to: '/study' },
			],
		},
		{
			id: 'review',
			label: 'Review',
			items: [
				{ label: 'Finish List', icon: 'i-lucide-check-circle', to: '/finish-list' },
				{ label: 'Stats', icon: 'i-lucide-bar-chart-3', to: '/stats' },
				{ label: 'Logs', icon: 'i-lucide-scroll-text', to: '/logs' },
			],
		},
		{
			id: 'assets',
			label: 'Assets Library',
			items: [
				{ label: 'Snippets', icon: 'i-lucide-code', to: '/snippets' },
				{ label: 'Vault', icon: 'i-lucide-lock', to: '/vault' },
				{ label: 'Notes', icon: 'i-lucide-notebook', to: '/notes' },
				{ label: 'Toolbox', icon: 'i-lucide-wrench', to: '/toolbox' },
			],
		},
		{
			id: 'settings',
			label: 'Settings',
			items: [{ label: 'Settings', icon: 'i-lucide-settings', to: '/settings' }],
		},
	])

	function onCommandSelect(item: CommandPaletteItem) {
		if (item?.to) {
			router.push(item.to as string)
			commandPaletteOpen.value = false
		}
	}

	// 监听 ⌘K 快捷键
	function handleKeydown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault()
			commandPaletteOpen.value = !commandPaletteOpen.value
		}
	}

	onMounted(() => {
		window.addEventListener('keydown', handleKeydown)
	})

	onUnmounted(() => {
		window.removeEventListener('keydown', handleKeydown)
	})

	// 暴露给子组件使用
	provide('commandPalette', {
		open: () => {
			commandPaletteOpen.value = true
		},
	})
</script>
