import { invalidateWorkspaceProjectQueries } from '@/features/workspace'

import type { CreateFlowProject, CreateProjectArgs } from '../model'
import { createFlowProject } from '../mutations'

export function useProjectCreateWorkflow() {
	async function createProjectFromModal(input: CreateProjectArgs): Promise<CreateFlowProject> {
		const project = await createFlowProject(input)
		await invalidateWorkspaceProjectQueries()
		return project
	}

	return {
		createProjectFromModal,
	}
}
