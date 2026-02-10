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
	import { watchDebounced } from '@vueuse/core'
	import { computed, watch } from 'vue'
	import { useRoute, useRouter } from 'vue-router'

	import { useNullableStringRouteQuery } from '@/composables/base/route-query'
	import { SPACE_IDS, type SpaceId } from '@/config/space'
	import { useStartupReady } from '@/startup/initialize'
	import { buildStartupSnapshotV2 } from '@/startup/session-snapshot'
	import Sidebar from './Sidebar.vue'
	import Header from './Header.vue'

	import TaskInspectorDrawer from '@/components/TaskInspectorDrawer'

	import { useSettingsStore } from '@/stores/settings'
	import { useViewStateStore } from '@/stores/view-state'

	const route = useRoute()
	const router = useRouter()
	const startupReady = useStartupReady()
	const routeProjectId = useNullableStringRouteQuery('project')
	const settingsStore = useSettingsStore()
	const viewStateStore = useViewStateStore()

	function isKnownSpaceId(value: string): value is SpaceId {
		return (SPACE_IDS as readonly string[]).includes(value)
	}

	function resolveRouteSpaceId(): SpaceId {
		const sid = route.params.spaceId
		if (typeof sid === 'string' && isKnownSpaceId(sid)) return sid
		return settingsStore.settings.activeSpaceId
	}

	const space = computed({
		get: () => settingsStore.settings.activeSpaceId,
		set: async (newSpaceId) => {
			if (newSpaceId === settingsStore.settings.activeSpaceId) return

			// 1. 切换前，保存旧 Space 状态 (Persist old space state)
			const oldSpaceId = resolveRouteSpaceId()
			const currentProjectId = routeProjectId.value

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

	// 路由驱动 activeSpace，避免启动期或外部跳转后出现“路由与侧栏 space 不一致”。
	watch(
		() => [route.params.spaceId, startupReady.value] as const,
		([spaceIdFromRoute, ready]) => {
			if (!ready) return
			if (typeof spaceIdFromRoute !== 'string' || !isKnownSpaceId(spaceIdFromRoute)) return
			if (spaceIdFromRoute === settingsStore.settings.activeSpaceId) return
			void settingsStore.update({ activeSpaceId: spaceIdFromRoute })
		},
		{ immediate: true },
	)

	// 路由高频变化时用防抖持久化，减少无效写入与启动期闪动。
	watchDebounced(
		() => [route.path, route.fullPath, routeProjectId.value, startupReady.value],
		() => {
			if (!startupReady.value) return

			const currentSpaceId = resolveRouteSpaceId()
			const projectId = routeProjectId.value

			// 记录任意页面状态
			void viewStateStore.setLastView(currentSpaceId, {
				route: route.path,
				spaceId: currentSpaceId,
				projectId,
			})
			void viewStateStore.setStartupSnapshot(
				buildStartupSnapshotV2({
					fullPath: route.fullPath,
					route: route.path,
					activeSpaceId: currentSpaceId,
					projectId,
				}),
			)
		},
		{
			debounce: 200,
			maxWait: 800,
		},
	)
</script>
