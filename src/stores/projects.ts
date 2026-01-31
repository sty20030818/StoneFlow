import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { ProjectDto } from '@/services/api/projects'
import { listProjects } from '@/services/api/projects'

export const useProjectsStore = defineStore('projects', () => {
	const loadedSpaceIds = ref<Set<string>>(new Set())
	const projects = ref<ProjectDto[]>([])

	async function loadForSpace(spaceId: string, force = false) {
		if (!force && loadedSpaceIds.value.has(spaceId)) return
		const data = await listProjects({ spaceId })
		projects.value = projects.value.filter((p) => p.spaceId !== spaceId).concat(data)
		loadedSpaceIds.value.add(spaceId)
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

	return {
		projects,
		loadForSpace,
		getProjectsOfSpace,
	}
})
