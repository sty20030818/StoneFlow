import { useWorkspaceEntityRepository } from '@/features/workspace'

import type { CreateFlowProject, CreateProjectArgs } from '../model'
import { createFlowProject } from '../mutations'

export function useProjectCreateWorkflow() {
	const repository = useWorkspaceEntityRepository()

	async function createProjectFromModal(input: CreateProjectArgs): Promise<CreateFlowProject> {
		const project = await createFlowProject(input)
		repository.upsertProject(project)
		return project
	}

	return {
		createProjectFromModal,
	}
}
