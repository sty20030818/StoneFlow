export function useProjectDrawerInteractions(params: {
	onNoteFocus: () => void
	onNoteBlur: () => void
	onNoteCompositionStart: () => void
	onNoteCompositionEnd: () => void
	onLinkFieldFocus: () => void
	onLinkFieldBlur: () => void
	onLinkCompositionStart: () => void
	onLinkCompositionEnd: () => void
}) {
	const noteInteraction = {
		onFocus: params.onNoteFocus,
		onBlur: params.onNoteBlur,
		onCompositionStart: params.onNoteCompositionStart,
		onCompositionEnd: params.onNoteCompositionEnd,
	}

	const linksInteraction = {
		onEditStart: params.onLinkFieldFocus,
		onEditEnd: params.onLinkFieldBlur,
		onCompositionStart: params.onLinkCompositionStart,
		onCompositionEnd: params.onLinkCompositionEnd,
	}

	return {
		noteInteraction,
		linksInteraction,
	}
}
