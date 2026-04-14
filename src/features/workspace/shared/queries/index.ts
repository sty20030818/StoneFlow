/**
 * Workspace 跨子域共享查询实现。
 */
export {
	PROJECTS_QUERY_GC_TIME,
	PROJECTS_QUERY_STALE_TIME,
	getWorkspaceProjectById,
	getWorkspaceProjectsSnapshot,
	patchWorkspaceProjectSnapshot,
	refreshWorkspaceProjectsQuery,
	useProjectsMutations,
	useProjectsQuery,
	warmupWorkspaceProjectsQuery,
	type UseProjectsQueryOptions,
} from './useProjectsQuery'
export {
	patchWorkspaceTaskSnapshot,
	refreshWorkspaceTaskScopes,
	useWorkspaceTaskBoardQuery,
	type WorkspaceTaskTransportStatus,
} from './useWorkspaceTaskBoardQuery'
