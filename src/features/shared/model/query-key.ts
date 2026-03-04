export type QueryKeyParams = Readonly<Record<string, unknown>>

export type StoneFlowQueryKey<
	D extends string = string,
	R extends string = string,
	S extends string = string,
> = readonly [domain: D, resource: R, scope: S, params: QueryKeyParams]

const EMPTY_QUERY_PARAMS: QueryKeyParams = Object.freeze({})

function normalizeQueryParams(params?: QueryKeyParams): QueryKeyParams {
	if (!params) return EMPTY_QUERY_PARAMS
	return Object.freeze({ ...params })
}

export function createQueryKey<const D extends string, const R extends string, const S extends string>(
	domain: D,
	resource: R,
	scope: S,
	params?: QueryKeyParams,
): StoneFlowQueryKey<D, R, S> {
	return [domain, resource, scope, normalizeQueryParams(params)]
}

export function createDomainQueryKeys<const D extends string>(domain: D) {
	return {
		domain,
		all: () => [domain] as const,
		resource<const R extends string>(resource: R) {
			return {
				all: () => createQueryKey(domain, resource, 'all'),
				scope<const S extends string>(scope: S, params?: QueryKeyParams) {
					return createQueryKey(domain, resource, scope, params)
				},
			}
		},
	}
}

export const queryKeyFactory = {
	workspace: createDomainQueryKeys('workspace'),
	inspector: createDomainQueryKeys('inspector'),
	remoteSync: createDomainQueryKeys('remote-sync'),
	settings: createDomainQueryKeys('settings'),
} as const
