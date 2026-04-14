/**
 * Workspace 共享模型契约。
 * 对外提供稳定类型、映射函数与查询失效策略。
 */
export {
	invalidateWorkspaceProjectQueries,
	invalidateWorkspaceTaskAndProjectQueries,
	invalidateWorkspaceTaskQueries,
} from './query-invalidation'
export { workspaceQueryKeys, type WorkspaceProjectListScope, type WorkspaceTaskListScope } from './query-keys'
export {
	mapWorkspaceProjectDtoToDomain,
	mapWorkspaceProjectsDtoToDomain,
	mapWorkspaceTaskDtoToDomain,
	mapWorkspaceTaskPatchToDto,
	mapWorkspaceTasksDtoToDomain,
	type WorkspaceCustomField,
	type WorkspaceCustomFields,
	type WorkspaceLink,
	type WorkspaceLinkInput,
	type WorkspaceProject,
	type WorkspaceTask,
	type WorkspaceTaskListArgs,
	type WorkspaceTaskPatch,
} from './types'
