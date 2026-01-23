export type SnippetDto = {
	id: string
	title: string
	language: string
	content: string
	folder: string | null
	tags: string[]
	linked_task_id: string | null
	linked_project_id: string | null
	created_at: number
	updated_at: number
}

const STORAGE_KEY = 'stoneflow_snippets'

/**
 * 临时实现：使用 localStorage 存储代码片段。
 * 后续可迁移到后端 Tauri command。
 */
export async function listSnippets(): Promise<SnippetDto[]> {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (!raw) return []
	try {
		return JSON.parse(raw) as SnippetDto[]
	} catch {
		return []
	}
}

export async function createSnippet(data: {
	title: string
	language: string
	content: string
	folder?: string | null
	tags?: string[]
	linked_task_id?: string | null
	linked_project_id?: string | null
}): Promise<SnippetDto> {
	const now = Date.now()
	const snippet: SnippetDto = {
		id: `snippet_${now}_${Math.random().toString(36).substring(2, 9)}`,
		title: data.title.trim(),
		language: data.language || 'plaintext',
		content: data.content,
		folder: data.folder ?? null,
		tags: data.tags ?? [],
		linked_task_id: data.linked_task_id ?? null,
		linked_project_id: data.linked_project_id ?? null,
		created_at: now,
		updated_at: now,
	}

	const all = await listSnippets()
	all.push(snippet)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
	return snippet
}

export async function updateSnippet(id: string, patch: Partial<SnippetDto>): Promise<void> {
	const all = await listSnippets()
	const idx = all.findIndex((s) => s.id === id)
	if (idx < 0) throw new Error('Snippet not found')
	all[idx] = { ...all[idx], ...patch, updated_at: Date.now() }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function deleteSnippet(id: string): Promise<void> {
	const all = await listSnippets()
	const filtered = all.filter((s) => s.id !== id)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
