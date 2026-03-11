/**
 * Workspace 对外稳定入口（白名单导出）。
 * 仅暴露外层调用需要的用例能力与稳定类型契约。
 */
export { useSpaceProjectsState } from './spaces'
export { useWorkspaceProjectView } from './projects'
export { DraggableProjectTree, ProjectHeaderCard, WorkspaceLayout, type ProjectTreeItem } from './projects'
export { TaskColumn } from './tasks'
export { listWorkspaceProjects } from './projects'
export { deleteWorkspaceProject, rebalanceWorkspaceProjectRanks, reorderWorkspaceProject } from './projects'
export {
	getWorkspaceProjectById,
	getWorkspaceProjectsSnapshot,
	patchWorkspaceTaskSnapshot,
	patchWorkspaceProjectSnapshot,
	refreshWorkspaceProjectsQuery,
	warmupWorkspaceProjectsQuery,
} from './shared/queries'
export {
	invalidateWorkspaceProjectQueries,
	invalidateWorkspaceTaskAndProjectQueries,
	invalidateWorkspaceTaskQueries,
	workspaceQueryKeys,
	type WorkspaceProject,
	type WorkspaceTask,
} from './shared/model'
export {
	createWorkspaceDefaultProjectSemantic,
	createWorkspaceProjectIndexKey,
	createWorkspaceProjectScopeKey,
	createWorkspaceRequestToken,
	createWorkspaceTaskScopeKey,
	isWorkspaceDefaultProject,
	useWorkspaceEntitiesStore,
	useWorkspaceEntityRepository,
	type WorkspaceDefaultProjectSemantic,
	type WorkspaceEntityProject,
	type WorkspaceEntityTask,
	WORKSPACE_UNASSIGNED_PROJECT_INDEX_KEY,
} from './entities'
