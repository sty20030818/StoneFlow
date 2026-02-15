import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { computed, ref } from 'vue'

import { DEFAULT_PROJECT_LABEL, isDefaultProjectId } from '@/config/project'
import type { ProjectDto } from '@/services/api/projects'
import { listProjects } from '@/services/api/projects'

export const useProjectsStore = defineStore('projects', () => {
	const snapshotBySpace = useStorage<Record<string, ProjectDto[]>>('projects_snapshot_v1', {})

	function normalizeProject(project: ProjectDto): ProjectDto {
		if (!isDefaultProjectId(project.id)) return project
		return {
			...project,
			title: DEFAULT_PROJECT_LABEL,
			path: `/${DEFAULT_PROJECT_LABEL}`,
		}
	}

	const normalizedSnapshotBySpace = Object.fromEntries(
		Object.entries(snapshotBySpace.value).map(([spaceId, list]) => [spaceId, list.map(normalizeProject)]),
	)
	snapshotBySpace.value = normalizedSnapshotBySpace
	const initialProjects = Object.values(normalizedSnapshotBySpace).flat()
	const loadedSpaceIds = ref<Set<string>>(new Set())
	const loadingSpaceIds = ref<Set<string>>(new Set())
	const projects = ref<ProjectDto[]>(initialProjects)
	const loadingBySpace = new Map<string, Promise<void>>()
	const loadingCounters = new Map<string, number>()

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
		const data = await listProjects({ spaceId })
		const normalizedData = data.map(normalizeProject)
		projects.value = projects.value.filter((p) => p.spaceId !== spaceId).concat(normalizedData)
		snapshotBySpace.value = { ...snapshotBySpace.value, [spaceId]: normalizedData }
		const nextLoaded = new Set(loadedSpaceIds.value)
		nextLoaded.add(spaceId)
		loadedSpaceIds.value = nextLoaded
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
		const map = new Map<string, ProjectDto[]>()
		for (const p of projects.value) {
			const arr = map.get(p.spaceId) ?? []
			arr.push(p)
			map.set(p.spaceId, arr)
		}
		return map
	})

	function getProjectsOfSpace(spaceId: string): ProjectDto[] {
		return bySpace.value.get(spaceId) ?? []
	}

	function isSpaceLoaded(spaceId: string): boolean {
		return loadedSpaceIds.value.has(spaceId)
	}

	function isSpaceLoading(spaceId: string): boolean {
		return loadingSpaceIds.value.has(spaceId)
	}

	return {
		projects,
		load,
		ensureLoaded,
		getProjectsOfSpace,
		isSpaceLoaded,
		isSpaceLoading,
	}
})
