import { createSnippet, deleteSnippet, updateSnippet } from '@/infra/api/snippets'

import {
	mapAssetSnippetDtoToDomain,
	mapAssetSnippetPatchToDto,
	type AssetSnippet,
	type AssetSnippetPatch,
} from './model'

type SaveSnippetPayload = {
	title: string
	language: string
	content: string
	folder?: string | null
	tags?: string[]
	linkedTaskId?: string | null
	linkedProjectId?: string | null
}

export async function createAssetSnippet(payload: SaveSnippetPayload): Promise<AssetSnippet> {
	const snippet = await createSnippet(payload)
	return mapAssetSnippetDtoToDomain(snippet)
}

export async function updateAssetSnippet(snippetId: string, payload: AssetSnippetPatch): Promise<void> {
	await updateSnippet(snippetId, mapAssetSnippetPatchToDto(payload))
}

export async function deleteAssetSnippet(snippetId: string): Promise<void> {
	await deleteSnippet(snippetId)
}
