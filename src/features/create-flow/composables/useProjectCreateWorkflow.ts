import { invalidateWorkspaceProjectQueries } from '@/features/workspace'

import type { CreateProjectArgs, ProjectDto } from '../model'
import { createFlowProject } from '../mutations'

export function useProjectCreateWorkflow() {
	async function createProjectFromModal(input: CreateProjectArgs): Promise<ProjectDto> {
		const project = await createFlowProject(input)
		await invalidateWorkspaceProjectQueries()
		return project
	}

	return {
		createProjectFromModal,
	}
}
