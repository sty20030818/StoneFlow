import type { NoteDto } from '@/services/api/notes'

export type AssetNote = {
	id: string
	title: string
	content: string
	linkedProjectId: string | null
	linkedTaskId: string | null
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
