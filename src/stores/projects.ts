import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { getDefaultProjectLabel, isDefaultProjectId } from '@/config/project'
import { stoneFlowQueryClient } from '@/features/shared'
import { listWorkspaceProjects } from '@/features/workspace'
import { workspaceQueryKeys } from '@/features/workspace/model/query-keys'
import type { WorkspaceProject } from '@/features/workspace/model'

export const useProjectsStore = defineStore('projects', () => {
	const snapshotBySpace = useStorage<Record<string, WorkspaceProject[]>>('projects_snapshot_v1', {})

	function normalizeProject(project: WorkspaceProject): WorkspaceProject {
		if (!isDefaultProjectId(project.id)) return project
		const defaultProjectLabel = getDefaultProjectLabel()
		return {
			...project,
			title: defaultProjectLabel,
			path: `/${defaultProjectLabel}`,
		}
	}

	const normalizedSnapshotBySpace: Record<string, WorkspaceProject[]> = Object.fromEntries(
		Object.entries(snapshotBySpace.value).map(([spaceId, list]: [string, WorkspaceProject[]]) => [
			spaceId,
			list.map(normalizeProject),
		]),
	)
	snapshotBySpace.value = normalizedSnapshotBySpace
	for (const [spaceId, list] of Object.entries(normalizedSnapshotBySpace)) {
		stoneFlowQueryClient.setQueryData(workspaceQueryKeys.projects.list({ spaceId }), list)
	}
	const initialProjects = Object.values(normalizedSnapshotBySpace).flat()
	const loadedSpaceIds = ref<Set<string>>(new Set())
	const loadingSpaceIds = ref<Set<string>>(new Set())
	const projects = ref<WorkspaceProject[]>(initialProjects)
	const loadingBySpace = new Map<string, Promise<void>>()
	const loadingCounters = new Map<string, number>()

	function syncSpaceProjects(
		spaceId: string,
		nextList: WorkspaceProject[],
		options: { markLoaded?: boolean; syncQueryCache?: boolean } = {},
	) {
		const normalizedList = nextList.map(normalizeProject)
		projects.value = projects.value.filter((project) => project.spaceId !== spaceId).concat(normalizedList)
		snapshotBySpace.value = {
			...snapshotBySpace.value,
			[spaceId]: normalizedList,
		}
		if (options.syncQueryCache ?? true) {
			stoneFlowQueryClient.setQueryData(workspaceQueryKeys.projects.list({ spaceId }), normalizedList)
		}
		if (!options.markLoaded) return
		const nextLoaded = new Set(loadedSpaceIds.value)
		nextLoaded.add(spaceId)
		loadedSpaceIds.value = nextLoaded
	}

	function markSpaceLoading(spaceId: string) {
		const nextCount = (loadingCounters.get(spaceId) ?? 0) + 1
		loadingCounters.set(spaceId, nextCount)
		if (nextCount === 1) {
			const next = new Set(loadingSpaceIds.value)
			next.add(spaceId)
			loadingSpaceIds.value = next
		}
	}

	function clearSpaceLoading(spaceId: string) {
		const current = loadingCounters.get(spaceId) ?? 0
		if (current <= 1) {
			loadingCounters.delete(spaceId)
			const next = new Set(loadingSpaceIds.value)
			next.delete(spaceId)
			loadingSpaceIds.value = next
			return
		}
		loadingCounters.set(spaceId, current - 1)
	}

	async function loadForSpaceInternal(spaceId: string) {
		const queryKey = workspaceQueryKeys.projects.list({ spaceId })
		const data = await stoneFlowQueryClient.fetchQuery({
			queryKey,
			queryFn: async () => {
				return await listWorkspaceProjects(spaceId)
			},
		})
		syncSpaceProjects(spaceId, data, { markLoaded: true })
	}

	async function load(spaceId: string, options: { force?: boolean } = {}) {
		const { force = false } = options
		if (!force && loadedSpaceIds.value.has(spaceId)) return
		const key = `${spaceId}:${force ? 'force' : 'normal'}`
		const running = loadingBySpace.get(key)
		if (running) {
			return await running
		}
		const promise = (async () => {
			markSpaceLoading(spaceId)
			try {
				if (force) {
					await stoneFlowQueryClient.invalidateQueries({
						queryKey: workspaceQueryKeys.projects.list({ spaceId }),
						exact: true,
					})
				}
				await loadForSpaceInternal(spaceId)
			} finally {
				clearSpaceLoading(spaceId)
				loadingBySpace.delete(key)
			}
		})()
		loadingBySpace.set(key, promise)
		return await promise
	}

	async function ensureLoaded(spaceId: string) {
		await load(spaceId)
		if (getProjectsOfSpace(spaceId).length === 0) {
			await load(spaceId, { force: true })
		}
	}

	const bySpace = computed(() => {
		const map = new Map<string, WorkspaceProject[]>()
		for (const p of projects.value) {
			const arr = map.get(p.spaceId) ?? []
			arr.push(p)
			map.set(p.spaceId, arr)
		}
		return map
	})

	function getProjectsOfSpace(spaceId: string): WorkspaceProject[] {
		return bySpace.value.get(spaceId) ?? []
	}

	function isSpaceLoaded(spaceId: string): boolean {
		return loadedSpaceIds.value.has(spaceId)
	}

	function isSpaceLoading(spaceId: string): boolean {
		return loadingSpaceIds.value.has(spaceId)
	}

	function patchProject(spaceId: string, projectId: string, patch: Partial<WorkspaceProject>) {
		let nextProject: WorkspaceProject | null = null
		projects.value = projects.value.map((project) => {
			if (project.spaceId !== spaceId || project.id !== projectId) return project
			nextProject = normalizeProject({
				...project,
				...patch,
			})
			return nextProject
		})
		if (!nextProject) return

		const currentSpaceSnapshot = snapshotBySpace.value[spaceId] ?? []
		const nextSpaceSnapshot = currentSpaceSnapshot.map((project) => {
			if (project.id !== projectId) return project
			return nextProject as WorkspaceProject
		})
		snapshotBySpace.value = {
			...snapshotBySpace.value,
			[spaceId]: nextSpaceSnapshot,
		}
		stoneFlowQueryClient.setQueryData(workspaceQueryKeys.projects.list({ spaceId }), nextSpaceSnapshot)
	}

	function getProjectById(spaceId: string, projectId: string): WorkspaceProject | null {
		return getProjectsOfSpace(spaceId).find((project) => project.id === projectId) ?? null
	}

	stoneFlowQueryClient.getQueryCache().subscribe((event) => {
		const query = event?.query
		if (!query || !workspaceQueryKeys.projects.isListKey(query.queryKey)) return
		const data = query.state.data
		if (!Array.isArray(data)) return
		const scope = query.queryKey[3]
		syncSpaceProjects(scope.spaceId, data as WorkspaceProject[], { syncQueryCache: false })
	})

	return {
		projects,
		load,
		ensureLoaded,
		getProjectsOfSpace,
		getProjectById,
		patchProject,
		isSpaceLoaded,
		isSpaceLoading,
	}
})
