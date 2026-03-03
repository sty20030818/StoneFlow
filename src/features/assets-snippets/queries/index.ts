import { listSnippets } from '@/services/api/snippets'

import type { SnippetDto } from '../model'

export async function listAssetSnippets(): Promise<SnippetDto[]> {
	return await listSnippets()
}
