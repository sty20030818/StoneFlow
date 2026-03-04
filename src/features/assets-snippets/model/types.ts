import type { SnippetDto } from '@/services/api/snippets'

export type AssetSnippet = {
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

export type AssetSnippetPatch = Partial<AssetSnippet>

export function mapAssetSnippetDtoToDomain(snippet: SnippetDto): AssetSnippet {
	return {
		...snippet,
		tags: [...snippet.tags],
	}
}

export function mapAssetSnippetsDtoToDomain(snippets: SnippetDto[]): AssetSnippet[] {
	return snippets.map(mapAssetSnippetDtoToDomain)
}

export function mapAssetSnippetPatchToDto(patch: AssetSnippetPatch): Partial<SnippetDto> {
	return {
		...patch,
		tags: patch.tags ? [...patch.tags] : patch.tags,
	}
}
