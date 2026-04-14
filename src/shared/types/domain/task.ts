import type { PriorityValue } from '@/shared/types/shared/priority'

export type TaskStatus = 'todo' | 'done'
export type TaskStatusValue = TaskStatus

export type TaskDoneReason = 'completed' | 'cancelled'
export type TaskDoneReasonValue = TaskDoneReason

export type TaskPriorityValue = PriorityValue
