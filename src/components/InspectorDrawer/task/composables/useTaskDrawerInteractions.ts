export function useTaskDrawerInteractions(params: {
	onNoteFocus: () => void
	onNoteBlur: () => void
	onNoteCompositionStart: () => void
	onNoteCompositionEnd: () => void
	onLinksEditStart: () => void
	onLinksEditEnd: () => void
	onLinksCompositionStart: () => void
	onLinksCompositionEnd: () => void
	onCustomFieldsEditStart: () => void
	onCustomFieldsEditEnd: () => void
	onCustomFieldsCompositionStart: () => void
	onCustomFieldsCompositionEnd: () => void
}) {
	const noteInteraction = {
		onFocus: params.onNoteFocus,
		onBlur: params.onNoteBlur,
		onCompositionStart: params.onNoteCompositionStart,
		onCompositionEnd: params.onNoteCompositionEnd,
	}

	const linksInteraction = {
		onEditStart: params.onLinksEditStart,
		onEditEnd: params.onLinksEditEnd,
		onCompositionStart: params.onLinksCompositionStart,
		onCompositionEnd: params.onLinksCompositionEnd,
	}

	const customFieldsInteraction = {
		onEditStart: params.onCustomFieldsEditStart,
		onEditEnd: params.onCustomFieldsEditEnd,
		onCompositionStart: params.onCustomFieldsCompositionStart,
		onCompositionEnd: params.onCustomFieldsCompositionEnd,
	}

	return {
		noteInteraction,
		linksInteraction,
		customFieldsInteraction,
	}
}
