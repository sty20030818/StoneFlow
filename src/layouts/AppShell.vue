<template>
	<div class="h-full flex bg-default text-default relative overflow-hidden z-layer-base">
		<Sidebar v-model:space="space" />

		<div
			v-motion="layoutMainMotion"
			class="flex-1 min-w-0 flex flex-col">
			<Header />

			<main class="flex-1 min-h-0 overflow-auto">
				<div
					v-motion="layoutContentMotion"
					class="p-4">
					<slot />
				</div>
			</main>
		</div>

		<!-- 右侧 Task Inspector Drawer，全局挂载在 Workspace Shell 上 -->
		<TaskInspectorDrawer />
	</div>
</template>

<script setup lang="ts">
	import { computed, onBeforeUnmount, watch } from 'vue'
	import { type RouteLocationNormalizedLoaded, useRoute, useRouter } from 'vue-router'

	import { useAppMotionPreset } from '@/composables/base/motion'
	import { SPACE_IDS, type SpaceId } from '@/config/space'
	import { useStartupReady } from '@/startup/initialize'
	import {
		classifyRouteScope,
		extractWorkspacePayload,
		isWorkspaceRoute,
		toWorkspaceRouteTarget,
	} from '@/startup/route-memory-policy'
	import Sidebar from './Sidebar.vue'
	import Header from './Header.vue'

	import TaskInspectorDrawer from '@/components/TaskInspectorDrawer'

	import { useSettingsStore } from '@/stores/settings'
	import { useViewStateStore } from '@/stores/view-state'

	const route = useRoute()
	const router = useRouter()
	const startupReady = useStartupReady()
	const settingsStore = useSettingsStore()
	const viewStateStore = useViewStateStore()
	const layoutMainMotion = useAppMotionPreset('drawerSection', 'layoutShell')
	const layoutContentMotion = useAppMotionPreset('drawerSection', 'sectionBase')

	function isKnownSpaceId(value: string): value is SpaceId {
		return (SPACE_IDS as readonly string[]).includes(value)
	}

	function resolveRouteSpaceId(): SpaceId {
		const sid = route.params.spaceId
		if (typeof sid === 'string' && isKnownSpaceId(sid)) return sid
		return settingsStore.settings.activeSpaceId
	}

	function resolveSpaceIdFromRoute(target: Pick<RouteLocationNormalizedLoaded, 'params'>): SpaceId {
		const sid = target.params.spaceId
		if (typeof sid === 'string' && isKnownSpaceId(sid)) return sid
		return settingsStore.settings.activeSpaceId
	}

	function resolveProjectIdFromRoute(target: Pick<RouteLocationNormalizedLoaded, 'query'>): string | null {
		const maybeProject = target.query.project
		if (typeof maybeProject === 'string') return maybeProject
		if (Array.isArray(maybeProject) && typeof maybeProject[0] === 'string') return maybeProject[0]
		return null
	}

	function persistRouteMemory(target: Pick<RouteLocationNormalizedLoaded, 'path' | 'params' | 'query'>) {
		const scope = classifyRouteScope(target.path)
		if (scope === 'settings') return

		if (scope === 'workspace') {
			const payload = extractWorkspacePayload({
				path: target.path,
				projectId: resolveProjectIdFromRoute(target),
				fallbackSpaceId: resolveSpaceIdFromRoute(target),
			})
			if (payload) {
				void viewStateStore.recordWorkspaceExit(payload)
			}
			return
		}

		if (scope === 'library') {
			void viewStateStore.recordLibraryExit(target.path)
			return
		}

		void viewStateStore.recordUnknownExit()
	}

	function normalizeInputSpaceId(value: string): SpaceId {
		if (isKnownSpaceId(value)) return value
		return settingsStore.settings.activeSpaceId
	}

	const space = computed({
		get: () => settingsStore.settings.activeSpaceId,
		set: async (newSpaceId) => {
			const targetSpaceId = normalizeInputSpaceId(newSpaceId)
			if (targetSpaceId === settingsStore.settings.activeSpaceId) return

			// 1. 切换前，保存旧 Space 状态 (Persist old space state)
			const oldSpaceId = resolveRouteSpaceId()
			const oldScope = classifyRouteScope(route.path)
			if (oldScope === 'workspace') {
				const payload = extractWorkspacePayload({
					path: route.path,
					projectId: resolveProjectIdFromRoute(route),
					fallbackSpaceId: oldSpaceId,
				})
				if (payload) {
					await viewStateStore.recordWorkspaceExit(payload)
				}
			}

			// 2. 更新 Active Space
			await settingsStore.update({ activeSpaceId: targetSpaceId })

			// 3. 恢复新 Space 状态 (Restore new space state)
			const restoreTarget = viewStateStore.getWorkspaceRestoreTarget(targetSpaceId)
			if (restoreTarget) {
				await router.push(toWorkspaceRouteTarget(restoreTarget))
			} else {
				// 默认 fallback
				await router.push(`/space/${targetSpaceId}`)
			}
		},
	})

	// 路由驱动 activeSpace，避免启动期或外部跳转后出现“路由与侧栏 space 不一致”。
	watch(
		() => [route.params.spaceId, startupReady.value] as const,
		([spaceIdFromRoute, ready]) => {
			if (!ready) return
			if (!isWorkspaceRoute(route.path)) return
			if (typeof spaceIdFromRoute !== 'string' || !isKnownSpaceId(spaceIdFromRoute)) return
			if (spaceIdFromRoute === settingsStore.settings.activeSpaceId) return
			void settingsStore.update({ activeSpaceId: spaceIdFromRoute })
		},
		{ immediate: true },
	)

	const stopAfterEach = router.afterEach((to, from) => {
		if (!startupReady.value) return
		persistRouteMemory(from)
		persistRouteMemory(to)
	})

	onBeforeUnmount(() => {
		stopAfterEach()
	})
</script>
