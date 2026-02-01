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

	import { SPACE_IDS } from '@/config/space'
	import { useSettingsStore } from '@/stores/settings'
	import { useSpacesStore } from '@/stores/spaces'
	import { useProjectsStore } from '@/stores/projects'
	import { useViewStateStore } from '@/stores/view-state'

	const toast = useToast()
	const route = useRoute()
	const router = useRouter()
	const settingsStore = useSettingsStore()
	const spacesStore = useSpacesStore()
	const projectsStore = useProjectsStore()
	const viewStateStore = useViewStateStore()
	const restoring = ref(true)

	function normalizeSpaceRoute(spaceId: string, path: string) {
		if (path === '/all-tasks') return `/space/${spaceId}`
		return path
	}

	function normalizeSpaceId(value?: string | null) {
		if (!value) return null
		return SPACE_IDS.includes(value as (typeof SPACE_IDS)[number]) ? (value as (typeof SPACE_IDS)[number]) : null
	}

	function parseSpaceIdFromRoute(path: string) {
		const match = path.match(/^\/space\/([^/]+)/)
		return match ? match[1] : null
	}

	function getRouteSpaceId() {
		const sid = route.params.spaceId
		if (typeof sid === 'string') return normalizeSpaceId(sid)
		if (!settingsStore.loaded) return null
		return settingsStore.settings.activeSpaceId ?? null
	}

	async function restoreLastView() {
		const lastView = viewStateStore.getLastView()
		if (!lastView) return

		const targetSpaceId =
			normalizeSpaceId(lastView.spaceId ?? parseSpaceIdFromRoute(lastView.route)) ??
			settingsStore.settings.activeSpaceId

		if (targetSpaceId && targetSpaceId !== settingsStore.settings.activeSpaceId) {
			await settingsStore.update({ activeSpaceId: targetSpaceId })
		}

		if (targetSpaceId) {
			await projectsStore.ensureLoaded(targetSpaceId)
		}

		let nextPath = lastView.route
		let nextQuery: Record<string, string> | undefined

		if (lastView.route.startsWith('/space/')) {
			nextPath = `/space/${targetSpaceId}`
			if (lastView.projectId && targetSpaceId) {
				const list = projectsStore.getProjectsOfSpace(targetSpaceId)
				const exists = list.some((p) => p.id === lastView.projectId)
				if (exists) {
					nextQuery = { project: lastView.projectId }
				}
			}
		}

		const currentProject = typeof route.query.project === 'string' ? route.query.project : undefined
		const samePath = route.path === nextPath && currentProject === nextQuery?.project
		if (!samePath) {
			await router.replace({ path: nextPath, query: nextQuery })
		}
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
			await viewStateStore.load()
			await restoreLastView()

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
			restoring.value = false
		}
	})

	// 监听路由变化，自动保存当前 space 的页面状态
	watch(
		() => [route.path, route.query.project, settingsStore.settings.activeSpaceId],
		() => {
			if (restoring.value || !settingsStore.loaded) return
			const currentSpaceId = settingsStore.settings.activeSpaceId
			const projectId = typeof route.query.project === 'string' ? route.query.project : null
			const spaceId = getRouteSpaceId()
			if (spaceId) {
				viewStateStore.setLastView({
					route: route.path,
					spaceId,
					projectId,
				})
			}
			if (currentSpaceId && (route.path.startsWith('/space/') || route.path === '/all-tasks')) {
				const normalizedRoute = normalizeSpaceRoute(currentSpaceId, route.path)
				spacesStore.savePageState(currentSpaceId, {
					route: normalizedRoute,
					projectId,
				})
			}
		},
	)
</script>
