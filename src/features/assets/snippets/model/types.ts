import type { SnippetDto } from '@/infra/api/snippets'

export type AssetSnippet = {
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
