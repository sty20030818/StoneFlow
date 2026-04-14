import { listTasks, type ListTasksArgs } from '@/infra/api/tasks'

import { mapWorkspaceTasksDtoToDomain, type WorkspaceTask, type WorkspaceTaskListArgs } from '../shared/model'

export type ListWorkspaceTasksArgs = WorkspaceTaskListArgs

export async function listWorkspaceTasks(args: ListWorkspaceTasksArgs): Promise<WorkspaceTask[]> {
	const tasks = await listTasks(args as ListTasksArgs)
	return mapWorkspaceTasksDtoToDomain(tasks)
}
