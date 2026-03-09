/**
 * Workspace 对外稳定入口（白名单导出）。
 * 仅暴露外层调用需要的用例能力与稳定类型契约。
 */
export { useSpaceProjectsState, useWorkspaceProjectView } from './composables'
export { DraggableProjectTree, ProjectHeaderCard, TaskColumn, WorkspaceLayout } from './ui'
export { listWorkspaceProjects } from './queries'
export { deleteWorkspaceProject, rebalanceWorkspaceProjectRanks, reorderWorkspaceProject } from './mutations'
export {
	getWorkspaceProjectsSnapshot,
	invalidateWorkspaceProjectQueries,
	invalidateWorkspaceTaskAndProjectQueries,
	invalidateWorkspaceTaskQueries,
	refreshWorkspaceProjectsQuery,
	warmupWorkspaceProjectsQuery,
	workspaceQueryKeys,
	type WorkspaceProject,
	type WorkspaceTask,
} from './model'
export type { ProjectTreeItem } from './ui'
