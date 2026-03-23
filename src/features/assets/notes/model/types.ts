import type { NoteDto } from '@/services/api/notes'

export type AssetNote = {
	id: string
	title: string
	content: string
	excerpt: string | null
	tags: string[]
	favorite: boolean
	linkedProjectId: string | null
	linkedTaskId: string | null
	syncState: string
	createdAt: number
	updatedAt: number
}

export type AssetNotePatch = Partial<AssetNote>

export function mapAssetNoteDtoToDomain(note: NoteDto): AssetNote {
	return {
		...note,
	}
}

export function mapAssetNotesDtoToDomain(notes: NoteDto[]): AssetNote[] {
	return notes.map(mapAssetNoteDtoToDomain)
}

export function mapAssetNotePatchToDto(patch: AssetNotePatch): Partial<NoteDto> {
	return {
		...patch,
	}
}
