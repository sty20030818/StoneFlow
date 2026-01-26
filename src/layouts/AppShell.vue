<template>
	<div class="h-full flex bg-default text-default relative overflow-hidden">
		<Sidebar v-model:space="space" />

		<div class="flex-1 min-w-0 flex flex-col">
			<Header />

			<main class="flex-1 min-h-0 overflow-auto">
				<div class="p-4">
					<div
						v-if="loading"
						class="text-sm text-muted">
						初始化中…
					</div>
					<slot />
				</div>
			</main>
		</div>

		<!-- 右侧 Task Inspector Drawer，全局挂载在 Workspace Shell 上 -->
		<TaskInspectorDrawer />
	</div>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref, watch } from 'vue'
	import { useRoute, useRouter } from 'vue-router'

	import Sidebar from './Sidebar.vue'
	import Header from './Header.vue'

	import TaskInspectorDrawer from '@/components/TaskInspectorDrawer.vue'

	import { useSettingsStore } from '@/stores/settings'
	import { useSpacesStore } from '@/stores/spaces'

	const toast = useToast()
	const route = useRoute()
	const router = useRouter()
	const settingsStore = useSettingsStore()
	const spacesStore = useSpacesStore()

	function normalizeSpaceRoute(spaceId: string, path: string) {
		if (path === '/all-tasks') return `/space/${spaceId}`
		return path
	}

	const space = computed({
		get: () => settingsStore.settings.activeSpaceId,
		set: async (v) => {
			// 保存当前 space 的页面状态
			const currentSpaceId = settingsStore.settings.activeSpaceId
			if (currentSpaceId && (route.path.startsWith('/space/') || route.path === '/all-tasks')) {
				const projectId = typeof route.query.project === 'string' ? route.query.project : null
				const normalizedRoute = normalizeSpaceRoute(currentSpaceId, route.path)
				spacesStore.savePageState(currentSpaceId, {
					route: normalizedRoute,
					projectId,
				})
			}

			// 更新 activeSpaceId
			await settingsStore.update({ activeSpaceId: v })

			// 恢复目标 space 的页面状态
			const targetState = spacesStore.getPageState(v)
			if (targetState.route === '/all-tasks') {
				await router.push({ path: `/space/${v}` })
			} else if (targetState.route.startsWith('/space/')) {
				// 使用新的 spaceId，但保留 projectId（如果存在）
				const query = targetState.projectId ? { project: targetState.projectId } : {}
				await router.push({ path: `/space/${v}`, query })
			} else {
				await router.push(targetState.route)
			}
		},
	})

	const loading = ref(false)

	onMounted(async () => {
		try {
			loading.value = true
			await settingsStore.load()
			await spacesStore.load()

			// 初始化时，如果当前路由是 space 页面，保存状态
			const currentSpaceId = settingsStore.settings.activeSpaceId
			if (currentSpaceId && (route.path.startsWith('/space/') || route.path === '/all-tasks')) {
				const projectId = typeof route.query.project === 'string' ? route.query.project : null
				const normalizedRoute = normalizeSpaceRoute(currentSpaceId, route.path)
				spacesStore.savePageState(currentSpaceId, {
					route: normalizedRoute,
					projectId,
				})
			}
		} catch (e) {
			toast.add({
				title: '初始化失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	})

	// 监听路由变化，自动保存当前 space 的页面状态
	watch(
		() => [route.path, route.query.project],
		() => {
			const currentSpaceId = settingsStore.settings.activeSpaceId
			if (currentSpaceId && (route.path.startsWith('/space/') || route.path === '/all-tasks')) {
				const projectId = typeof route.query.project === 'string' ? route.query.project : null
				const normalizedRoute = normalizeSpaceRoute(currentSpaceId, route.path)
				spacesStore.savePageState(currentSpaceId, {
					route: normalizedRoute,
					projectId,
				})
			}
		},
	)
</script>
