import { deleteProject, rebalanceProjectRanks, reorderProject } from '@/infra/api/projects'

export async function deleteWorkspaceProject(projectId: string): Promise<void> {
	await deleteProject(projectId)
}

export async function reorderWorkspaceProject(
	projectId: string,
	newRank: number,
	newParentId?: string | null,
): Promise<void> {
	await reorderProject(projectId, newRank, newParentId)
}

export async function rebalanceWorkspaceProjectRanks(projectIds: string[], step = 1024): Promise<void> {
	await rebalanceProjectRanks(projectIds, step)
}
