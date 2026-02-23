import { useAsyncState } from '@vueuse/core'
import { computed, watch, type Ref } from 'vue'

import { listActivityLogs, type ActivityLogEntry } from '@/services/api/logs'
import type { ProjectDto } from '@/services/api/projects'

export function useProjectInspectorActivityLogs(params: {
	currentProject: Ref<ProjectDto | null>
	projectTick: Ref<number>
}) {
	const projectId = computed(() => params.currentProject.value?.id ?? null)

	const {
		state: timelineLogs,
		isLoading: timelineLoading,
		error: timelineError,
		execute,
	} = useAsyncState(
		async (id: string) =>
			await listActivityLogs({
				entityType: 'project',
				projectId: id,
				limit: 50,
			}),
		[] as ActivityLogEntry[],
		{
			immediate: false,
			resetOnExecute: false,
		},
	)

	const timelineErrorMessage = computed(() => {
		if (!projectId.value) return null
		const error = timelineError.value
		if (!error) return null
		return error instanceof Error ? error.message : '加载项目日志失败'
	})

	const timelineEmpty = computed(() => {
		return !timelineLoading.value && !timelineError.value && timelineLogs.value.length === 0
	})

	async function reloadTimeline() {
		const id = projectId.value
		if (!id) {
			timelineLogs.value = []
			return
		}
		await execute(0, id)
	}

	watch(
		projectId,
		() => {
			void reloadTimeline()
		},
		{ immediate: true },
	)

	watch(
		() => params.projectTick.value,
		() => {
			if (!projectId.value) return
			void reloadTimeline()
		},
	)

	return {
		timelineLogs,
		timelineLoading,
		timelineErrorMessage,
		timelineEmpty,
		reloadTimeline,
	}
}
