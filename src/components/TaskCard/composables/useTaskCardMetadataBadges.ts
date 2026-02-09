import type { TaskDto } from '@/services/api/tasks'
import { computed } from 'vue'

export type TaskCardMetaItem = {
	title: string
	value: string
}

export type TaskCardMetaBadgeKey = 'customFields' | 'links'

export type TaskCardMetaBadge = {
	key: TaskCardMetaBadgeKey
	icon: string
	label: string
	count: number
	items: TaskCardMetaItem[]
}

type TaskCardMetadataSource = Pick<TaskDto, 'links' | 'customFields'>

const EMPTY_TITLE = '未命名'
const EMPTY_VALUE = '-'

function normalizeText(value: string | null | undefined, fallback: string) {
	const normalized = value?.trim()
	return normalized ? normalized : fallback
}

export function useTaskCardMetadataBadges(task: TaskCardMetadataSource) {
	const linkItems = computed<TaskCardMetaItem[]>(() => {
		return (task.links ?? []).map((item) => ({
			title: normalizeText(item.title, EMPTY_TITLE),
			value: normalizeText(item.url, EMPTY_VALUE),
		}))
	})

	const customFieldItems = computed<TaskCardMetaItem[]>(() => {
		return (task.customFields?.fields ?? []).map((field) => ({
			title: normalizeText(field.title, EMPTY_TITLE),
			value: normalizeText(field.value, EMPTY_VALUE),
		}))
	})

	const badges = computed<TaskCardMetaBadge[]>(() => {
		const metadataBadges: TaskCardMetaBadge[] = [
			{
				key: 'customFields',
				icon: 'i-lucide-list-plus',
				label: '自定义字段',
				count: customFieldItems.value.length,
				items: customFieldItems.value,
			},
			{
				key: 'links',
				icon: 'i-lucide-link-2',
				label: '关联链接',
				count: linkItems.value.length,
				items: linkItems.value,
			},
		]

		return metadataBadges.filter((item) => item.count > 0)
	})

	return {
		badges,
	}
}
