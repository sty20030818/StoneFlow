import type { QueryKey } from '@tanstack/vue-query'

import { createQueryKey } from '@/features/shared'

function isAssetsVaultQueryKey(queryKey: QueryKey): boolean {
	return queryKey[0] === 'assets' && queryKey[1] === 'vault'
}

export const assetsVaultQueryKeys = {
	entries: {
		list: () => createQueryKey('assets', 'vault', 'list'),
		isMatch: isAssetsVaultQueryKey,
	},
} as const
