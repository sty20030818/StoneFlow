import { listTasks, type ListTasksArgs, type TaskDto } from '@/services/api/tasks'

export type ListWorkspaceTasksArgs = ListTasksArgs

export async function listWorkspaceTasks(args: ListWorkspaceTasksArgs): Promise<TaskDto[]> {
	return await listTasks(args)
}
