import { createQueryKey } from '@/features/shared'

type QueryKeyLike = readonly unknown[]

function isRemoteSyncProfilesQueryKey(queryKey: QueryKeyLike): boolean {
	return queryKey[0] === 'remote-sync' && queryKey[1] === 'profiles'
}

function isRemoteSyncHistoryQueryKey(queryKey: QueryKeyLike): boolean {
	return queryKey[0] === 'remote-sync' && queryKey[1] === 'history'
}

export const remoteSyncQueryKeys = {
	profiles: {
		list: () => createQueryKey('remote-sync', 'profiles', 'list'),
		isMatch: isRemoteSyncProfilesQueryKey,
	},
	history: {
		list: () => createQueryKey('remote-sync', 'history', 'list'),
		isMatch: isRemoteSyncHistoryQueryKey,
	},
} as const
