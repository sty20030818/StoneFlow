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

	import TaskInspectorDrawer from '@/components/TaskInspectorDrawer'

	import { useSettingsStore } from '@/stores/settings'
	import { useSpacesStore } from '@/stores/spaces'
	import { useViewStateStore } from '@/stores/view-state'

	const toast = useToast()
	const route = useRoute()
	const router = useRouter()
	const settingsStore = useSettingsStore()
	const spacesStore = useSpacesStore()
	const viewStateStore = useViewStateStore()
	const restoring = ref(true)

	async function restoreLastView() {
		// 恢复上一次 active space 的 view
		const currentSpaceId = settingsStore.settings.activeSpaceId
		const lastView = viewStateStore.getLastView(currentSpaceId)

		if (lastView && lastView.route) {
			let nextPath = lastView.route
			let nextQuery = {}
			if (lastView.projectId) {
				nextQuery = { project: lastView.projectId }
			}
			await router.replace({ path: nextPath, query: nextQuery })
		}
	}

	const space = computed({
		get: () => settingsStore.settings.activeSpaceId,
		set: async (newSpaceId) => {
			if (newSpaceId === settingsStore.settings.activeSpaceId) return

			// 1. 切换前，保存旧 Space 状态 (Persist old space state)
			const oldSpaceId = settingsStore.settings.activeSpaceId
			const currentProjectId = typeof route.query.project === 'string' ? route.query.project : null

			// 确保存的是合规的 space 路由
			await viewStateStore.setLastView(oldSpaceId, {
				route: route.path,
				spaceId: oldSpaceId,
				projectId: currentProjectId,
			})

			// 2. 更新 Active Space
			await settingsStore.update({ activeSpaceId: newSpaceId })

			// 3. 恢复新 Space 状态 (Restore new space state)
			const lastView = viewStateStore.getLastView(newSpaceId)
			if (lastView) {
				const query = lastView.projectId ? { project: lastView.projectId } : {}
				await router.push({ path: lastView.route, query })
			} else {
				// 默认 fallback
				await router.push(`/space/${newSpaceId}`)
			}
		},
	})

	const loading = ref(false)

	onMounted(async () => {
		try {
			loading.value = true
			await settingsStore.load()
			await spacesStore.load()
			// viewStateStore 已经在 main.ts 中 load() 过了，这里不需要再 await，或者再次 await 也没问题

			await restoreLastView()
		} catch (e) {
			toast.add({
				title: '初始化失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loading.value = false
			restoring.value = false
		}
	})

	// 监听路由变化，实时持久化当前 Space 状态
	watch(
		() => [route.path, route.query.project],
		() => {
			if (restoring.value || !settingsStore.loaded) return

			const currentSpaceId = settingsStore.settings.activeSpaceId
			const projectId = typeof route.query.project === 'string' ? route.query.project : null

			// 记录任意页面状态
			viewStateStore.setLastView(currentSpaceId, {
				route: route.path,
				spaceId: currentSpaceId,
				projectId,
			})
		},
	)
</script>
