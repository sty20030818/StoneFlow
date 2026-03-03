import type { QueryKey } from '@tanstack/vue-query'

import { createQueryKey } from '@/features/shared'

function isAssetsSnippetsQueryKey(queryKey: QueryKey): boolean {
	return queryKey[0] === 'assets' && queryKey[1] === 'snippets'
}

export const assetsSnippetsQueryKeys = {
	entries: {
		list: () => createQueryKey('assets', 'snippets', 'list'),
		isMatch: isAssetsSnippetsQueryKey,
	},
} as const
