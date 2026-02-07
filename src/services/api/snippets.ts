import { useSharedStorage } from '@/composables/base/storage'

export type SnippetDto = {
	id: string
	title: string
	language: string
	content: string
	folder: string | null
	tags: string[]
	linkedTaskId: string | null
	linkedProjectId: string | null
	createdAt: number
	updatedAt: number
}

const STORAGE_KEY = 'stoneflow_snippets'

function useSnippetsStorage() {
	return useSharedStorage<Partial<SnippetDto>[]>(STORAGE_KEY, [])
}

/**
 * 临时实现：使用 localStorage 存储代码片段。
 * 后续可迁移到后端 Tauri command。
 */
export async function listSnippets(): Promise<SnippetDto[]> {
	const parsed = useSnippetsStorage().value
	return parsed.map((snippet) => ({
		id: snippet.id ?? '',
		title: snippet.title ?? '',
		language: snippet.language ?? '',
		content: snippet.content ?? '',
		folder: snippet.folder ?? null,
		tags: snippet.tags ?? [],
		linkedTaskId: snippet.linkedTaskId ?? (snippet as { linked_task_id?: string | null }).linked_task_id ?? null,
		linkedProjectId:
			snippet.linkedProjectId ?? (snippet as { linked_project_id?: string | null }).linked_project_id ?? null,
		createdAt: snippet.createdAt ?? (snippet as { created_at?: number }).created_at ?? 0,
		updatedAt: snippet.updatedAt ?? (snippet as { updated_at?: number }).updated_at ?? 0,
	}))
}

export async function createSnippet(data: {
	title: string
	language: string
	content: string
	folder?: string | null
	tags?: string[]
	linkedTaskId?: string | null
	linkedProjectId?: string | null
}): Promise<SnippetDto> {
	const now = Date.now()
	const snippet: SnippetDto = {
		id: `snippet_${now}_${Math.random().toString(36).substring(2, 9)}`,
		title: data.title.trim(),
		language: data.language || 'plaintext',
		content: data.content,
		folder: data.folder ?? null,
		tags: data.tags ?? [],
		linkedTaskId: data.linkedTaskId ?? null,
		linkedProjectId: data.linkedProjectId ?? null,
		createdAt: now,
		updatedAt: now,
	}

	const all = await listSnippets()
	all.push(snippet)
	useSnippetsStorage().value = all
	return snippet
}

export async function updateSnippet(id: string, patch: Partial<SnippetDto>): Promise<void> {
	const all = await listSnippets()
	const idx = all.findIndex((s) => s.id === id)
	if (idx < 0) throw new Error('Snippet not found')
	all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
	useSnippetsStorage().value = all
}

export async function deleteSnippet(id: string): Promise<void> {
	const all = await listSnippets()
	const filtered = all.filter((s) => s.id !== id)
	useSnippetsStorage().value = filtered
}
