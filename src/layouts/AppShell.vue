<template>
	<div class="h-full flex bg-default text-default relative overflow-hidden z-layer-base">
		<Sidebar v-model:space="space" />

		<div class="flex-1 min-w-0 flex flex-col">
			<Header />

			<main class="flex-1 min-h-0 overflow-auto">
				<div class="p-4">
					<slot />
				</div>
			</main>
		</div>

		<!-- 右侧 Task Inspector Drawer，全局挂载在 Workspace Shell 上 -->
		<TaskInspectorDrawer />
	</div>
</template>

<script setup lang="ts">
	import { computed, watch } from 'vue'
	import { useRoute, useRouter } from 'vue-router'

	import Sidebar from './Sidebar.vue'
	import Header from './Header.vue'

	import TaskInspectorDrawer from '@/components/TaskInspectorDrawer'

	import { useSettingsStore } from '@/stores/settings'
	import { useViewStateStore } from '@/stores/view-state'

	const route = useRoute()
	const router = useRouter()
	const settingsStore = useSettingsStore()
	const viewStateStore = useViewStateStore()

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

	// 监听路由变化，实时持久化当前 Space 状态
	watch(
		() => [route.path, route.query.project],
		() => {
			if (!settingsStore.loaded || !viewStateStore.loaded) return

			const currentSpaceId = settingsStore.settings.activeSpaceId
			const projectId = typeof route.query.project === 'string' ? route.query.project : null

			// 记录任意页面状态
			void viewStateStore.setLastView(currentSpaceId, {
				route: route.path,
				spaceId: currentSpaceId,
				projectId,
			})
		},
	)
</script>
