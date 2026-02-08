import type { CustomFieldItem, CustomFields, LinkDto, LinkInput } from '@/services/api/tasks'

export type TaskLinkFormItem = {
	id?: string
	title: string
	url: string
	kind: LinkDto['kind']
}

export type TaskCustomFieldFormItem = {
	key: string
	label: string
	value: string
}

export function normalizeProjectId(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? ''
	return normalized ? normalized : null
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? ''
	return normalized ? normalized : null
}

export function toDeadlineInputValue(deadlineAt: number | null | undefined): string {
	if (!deadlineAt) return ''
	const date = new Date(deadlineAt)
	if (Number.isNaN(date.getTime())) return ''
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function toDeadlineTimestamp(value: string): number | null {
	const normalized = value.trim()
	if (!normalized) return null
	const date = new Date(normalized)
	const timestamp = date.getTime()
	if (Number.isNaN(timestamp)) return null
	return timestamp
}

export function toLinksFormItems(links: LinkDto[] | null | undefined): TaskLinkFormItem[] {
	if (!links?.length) return []
	return links.map((item) => ({
		id: item.id,
		title: item.title ?? '',
		url: item.url ?? '',
		kind: item.kind,
	}))
}

export function toLinkPatch(values: TaskLinkFormItem[]): LinkInput[] {
	const result: LinkInput[] = []
	for (const item of values) {
		const url = item.url.trim()
		if (!url) continue
		const title = item.title.trim()
		result.push({
			id: item.id,
			title,
			url,
			kind: item.kind,
		})
	}
	return result
}

export function areLinkPatchesEqual(left: LinkInput[], right: LinkInput[]): boolean {
	if (left.length !== right.length) return false
	for (let index = 0; index < left.length; index += 1) {
		const l = left[index]
		const r = right[index]
		if (!l || !r) return false
		if ((l.id ?? '') !== (r.id ?? '')) return false
		if (l.kind !== r.kind) return false
		if (l.title !== r.title) return false
		if (l.url !== r.url) return false
	}
	return true
}

export function toCustomFieldsFormItems(customFields: CustomFields | null | undefined): TaskCustomFieldFormItem[] {
	if (!customFields?.fields?.length) return []
	return customFields.fields.map((item) => ({
		key: item.key ?? '',
		label: item.label ?? '',
		value: item.value ?? '',
	}))
}

export function toCustomFieldItems(values: TaskCustomFieldFormItem[]): CustomFieldItem[] {
	const result: CustomFieldItem[] = []
	for (const item of values) {
		const key = item.key.trim()
		const label = item.label.trim()
		if (!key || !label) continue
		const value = normalizeOptionalText(item.value)
		result.push({
			key,
			label,
			value,
		})
	}
	return result
}

export function toCustomFieldsPatch(values: TaskCustomFieldFormItem[]): CustomFields | null {
	const fields = toCustomFieldItems(values)
	if (fields.length === 0) return null
	return { fields }
}

export function areCustomFieldsEqual(left: CustomFields | null | undefined, right: CustomFields | null | undefined): boolean {
	const leftFields = toCustomFieldItems(toCustomFieldsFormItems(left))
	const rightFields = toCustomFieldItems(toCustomFieldsFormItems(right))
	if (leftFields.length !== rightFields.length) return false
	for (let index = 0; index < leftFields.length; index += 1) {
		const l = leftFields[index]
		const r = rightFields[index]
		if (!l || !r) return false
		if (l.key !== r.key) return false
		if (l.label !== r.label) return false
		if ((l.value ?? null) !== (r.value ?? null)) return false
	}
	return true
}
