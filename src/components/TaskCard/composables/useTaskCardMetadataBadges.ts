import { useI18n } from 'vue-i18n'
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

function normalizeText(value: string | null | undefined, fallback: string) {
	const normalized = value?.trim()
	return normalized ? normalized : fallback
}

export function useTaskCardMetadataBadges(task: TaskCardMetadataSource) {
	const { t } = useI18n({ useScope: 'global' })

	const linkItems = computed<TaskCardMetaItem[]>(() => {
		return (task.links ?? []).map((item) => ({
			title: normalizeText(item.title, t('taskCard.metadata.untitled')),
			value: normalizeText(item.url, t('taskCard.metadata.emptyValue')),
		}))
	})

	const customFieldItems = computed<TaskCardMetaItem[]>(() => {
		return (task.customFields?.fields ?? []).map((field) => ({
			title: normalizeText(field.title, t('taskCard.metadata.untitled')),
			value: normalizeText(field.value, t('taskCard.metadata.emptyValue')),
		}))
	})

	const badges = computed<TaskCardMetaBadge[]>(() => {
		const metadataBadges: TaskCardMetaBadge[] = [
			{
				key: 'customFields',
				icon: 'i-lucide-list-plus',
				label: t('taskCard.metadata.customFields'),
				count: customFieldItems.value.length,
				items: customFieldItems.value,
			},
			{
				key: 'links',
				icon: 'i-lucide-link-2',
				label: t('taskCard.metadata.links'),
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
