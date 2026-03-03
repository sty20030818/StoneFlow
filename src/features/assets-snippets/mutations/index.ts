import { createSnippet, deleteSnippet, updateSnippet } from '@/services/api/snippets'

import type { SnippetDto } from '../model'

type SaveSnippetPayload = {
	title: string
	language: string
	content: string
	folder?: string | null
	tags?: string[]
	linkedTaskId?: string | null
	linkedProjectId?: string | null
}

export async function createAssetSnippet(payload: SaveSnippetPayload): Promise<SnippetDto> {
	return await createSnippet(payload)
}

export async function updateAssetSnippet(snippetId: string, payload: Partial<SnippetDto>): Promise<void> {
	await updateSnippet(snippetId, payload)
}

export async function deleteAssetSnippet(snippetId: string): Promise<void> {
	await deleteSnippet(snippetId)
}
