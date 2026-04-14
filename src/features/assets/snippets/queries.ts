import { listSnippets } from '@/infra/api/snippets'

import { mapAssetSnippetsDtoToDomain, type AssetSnippet } from './model'

export async function listAssetSnippets(): Promise<AssetSnippet[]> {
	const snippets = await listSnippets()
	return mapAssetSnippetsDtoToDomain(snippets)
}
