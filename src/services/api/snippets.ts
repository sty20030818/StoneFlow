import { tauriInvoke } from '@/services/tauri/invoke'

export type SnippetDto = {
	id: string
	title: string
	language: string
	content: string
	description: string | null
	folder: string | null
	tags: string[]
	favorite: boolean
	linkedTaskId: string | null
	linkedProjectId: string | null
	syncState: string
	createdAt: number
	updatedAt: number
}

export async function listSnippets(): Promise<SnippetDto[]> {
	return await tauriInvoke<SnippetDto[]>('list_snippets')
}

export async function createSnippet(data: {
	title: string
	language: string
	content: string
	description?: string | null
	folder?: string | null
	tags?: string[]
	favorite?: boolean
	linkedTaskId?: string | null
	linkedProjectId?: string | null
}): Promise<SnippetDto> {
	return await tauriInvoke<SnippetDto>('create_snippet', {
		args: {
			title: data.title,
			language: data.language,
			content: data.content,
			description: data.description ?? null,
			folder: data.folder ?? null,
			tags: data.tags ?? [],
			favorite: data.favorite ?? false,
			linkedTaskId: data.linkedTaskId ?? null,
			linkedProjectId: data.linkedProjectId ?? null,
		},
	})
}

export async function updateSnippet(id: string, patch: Partial<SnippetDto>): Promise<void> {
	await tauriInvoke<void>('update_snippet', {
		args: { id, patch },
	})
}

export async function deleteSnippet(id: string): Promise<void> {
	await tauriInvoke<void>('delete_snippet', {
		args: { id },
	})
}
