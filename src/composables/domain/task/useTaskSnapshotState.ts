import { createGlobalState, useStorage } from '@vueuse/core'
import { ref } from 'vue'

import type { TaskDto } from '@/services/api/tasks'

type SpaceTaskSnapshot = {
	todo: TaskDto[]
	doneToday: TaskDto[]
}

type ProjectTaskSnapshot = {
	todo: TaskDto[]
	doneAll: TaskDto[]
}

const SNAPSHOT_TTL_MS = 3 * 24 * 60 * 60 * 1000
const MAX_SCOPE_COUNT = 24
const MAX_TASKS_PER_SCOPE = 120

function trimTasks(tasks: TaskDto[]): TaskDto[] {
	return tasks.slice(0, MAX_TASKS_PER_SCOPE).map((task) => ({
		...task,
		note: null,
		links: [],
		customFields: null,
	}))
}

function getSnapshotUpdatedAt(tasks: TaskDto[]): number {
	return tasks.reduce((latest, task) => Math.max(latest, task.updatedAt || task.createdAt || 0), 0)
}

function compactSpaceSnapshots(source: Record<string, SpaceTaskSnapshot>): Record<string, SpaceTaskSnapshot> {
	const now = Date.now()
	const entries = Object.entries(source)
		.map(([scopeKey, snapshot]) => {
			const sanitized: SpaceTaskSnapshot = {
				todo: trimTasks(snapshot.todo ?? []),
				doneToday: trimTasks(snapshot.doneToday ?? []),
			}
			return {
				scopeKey,
				snapshot: sanitized,
				updatedAt: getSnapshotUpdatedAt([...sanitized.todo, ...sanitized.doneToday]),
			}
		})
		.filter((entry) => entry.updatedAt <= 0 || now - entry.updatedAt <= SNAPSHOT_TTL_MS)
		.sort((left, right) => right.updatedAt - left.updatedAt)
		.slice(0, MAX_SCOPE_COUNT)

	return Object.fromEntries(entries.map((entry) => [entry.scopeKey, entry.snapshot]))
}

function compactProjectSnapshots(source: Record<string, ProjectTaskSnapshot>): Record<string, ProjectTaskSnapshot> {
	const now = Date.now()
	const entries = Object.entries(source)
		.map(([scopeKey, snapshot]) => {
			const sanitized: ProjectTaskSnapshot = {
				todo: trimTasks(snapshot.todo ?? []),
				doneAll: trimTasks(snapshot.doneAll ?? []),
			}
			return {
				scopeKey,
				snapshot: sanitized,
				updatedAt: getSnapshotUpdatedAt([...sanitized.todo, ...sanitized.doneAll]),
			}
		})
		.filter((entry) => entry.updatedAt <= 0 || now - entry.updatedAt <= SNAPSHOT_TTL_MS)
		.sort((left, right) => right.updatedAt - left.updatedAt)
		.slice(0, MAX_SCOPE_COUNT)

	return Object.fromEntries(entries.map((entry) => [entry.scopeKey, entry.snapshot]))
}

export const useTaskSnapshotState = createGlobalState(() => {
	const spaceSnapshots = useStorage<Record<string, SpaceTaskSnapshot>>('space_tasks_snapshot_v1', {})
	const projectSnapshots = useStorage<Record<string, ProjectTaskSnapshot>>('project_tasks_snapshot_v1', {})
	spaceSnapshots.value = compactSpaceSnapshots(spaceSnapshots.value)
	projectSnapshots.value = compactProjectSnapshots(projectSnapshots.value)
	const loadedSpaceScopes = ref(new Set<string>())
	const loadedProjectScopes = ref(new Set<string>())

	function setSpaceSnapshot(scopeKey: string, snapshot: SpaceTaskSnapshot) {
		spaceSnapshots.value = compactSpaceSnapshots({
			...spaceSnapshots.value,
			[scopeKey]: snapshot,
		})
	}

	function setProjectSnapshot(scopeKey: string, snapshot: ProjectTaskSnapshot) {
		projectSnapshots.value = compactProjectSnapshots({
			...projectSnapshots.value,
			[scopeKey]: snapshot,
		})
	}

	return {
		spaceSnapshots,
		projectSnapshots,
		loadedSpaceScopes,
		loadedProjectScopes,
		setSpaceSnapshot,
		setProjectSnapshot,
	}
})
