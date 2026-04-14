/**
 * Workspace 对外稳定入口（白名单导出）。
 * 仅暴露外层调用需要的用例能力与稳定类型契约。
 */
export { useSpaceProjectsState } from './spaces'
export { useWorkspaceProjectView } from './project-view'
export { DraggableProjectTree, ProjectHeaderCard, WorkspaceLayout, type ProjectTreeItem } from './project-view'
export { TaskColumn } from './task-board'
export { useProjectTreeStore } from './project-tree/store/project-tree'
export { useInlineCreateFocusStore } from './task-board/store/inline-create-focus'
export { useWorkspaceEditStore, type WorkspaceEditCommand } from './project-view/store/workspace-edit'
export { listWorkspaceProjects } from './project-view'
export { deleteWorkspaceProject, rebalanceWorkspaceProjectRanks, reorderWorkspaceProject } from './project-view'
export {
	getWorkspaceProjectById,
	getWorkspaceProjectsSnapshot,
	patchWorkspaceTaskSnapshot,
	patchWorkspaceProjectSnapshot,
	refreshWorkspaceProjectsQuery,
	refreshWorkspaceTaskScopes,
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
	getWorkspaceProjectByIdSnapshot,
	getWorkspaceProjectsBySpaceSnapshot,
	getWorkspaceProjectEntityByIdSnapshot,
	getWorkspaceTaskByIdSnapshot,
	getWorkspaceTaskEntityByIdSnapshot,
	getWorkspaceTasksByScopeSnapshot,
	isWorkspaceDefaultProject,
	useWorkspaceEntitiesStore,
	useWorkspaceEntityRepository,
	useWorkspaceProjectsController,
	useWorkspaceTaskBoardController,
	type WorkspaceDefaultProjectSemantic,
	type WorkspaceEntityProject,
	type WorkspaceEntityTask,
	WORKSPACE_UNASSIGNED_PROJECT_INDEX_KEY,
} from './entities'
