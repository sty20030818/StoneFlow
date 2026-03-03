import type { QueryKey } from '@tanstack/vue-query'

import { createQueryKey } from '@/features/shared'

function isAssetsNotesQueryKey(queryKey: QueryKey): boolean {
	return queryKey[0] === 'assets' && queryKey[1] === 'notes'
}

export const assetsNotesQueryKeys = {
	entries: {
		list: () => createQueryKey('assets', 'notes', 'list'),
		isMatch: isAssetsNotesQueryKey,
	},
} as const
