import type { QueryKey } from '@tanstack/vue-query'

import { createQueryKey } from '@/features/shared'

function isAssetsDiaryQueryKey(queryKey: QueryKey): boolean {
	return queryKey[0] === 'assets' && queryKey[1] === 'diary'
}

export const assetsDiaryQueryKeys = {
	entries: {
		list: () => createQueryKey('assets', 'diary', 'list'),
		isMatch: isAssetsDiaryQueryKey,
	},
} as const
