import { useRouteQuery } from '@vueuse/router'
import { computed } from 'vue'

export function useNullableStringRouteQuery(name: string) {
	const query = useRouteQuery<string | null>(name, null, {
		mode: 'replace',
	})

	return computed<string | null>({
		get: () => {
			const value = query.value
			return typeof value === 'string' && value.length > 0 ? value : null
		},
		set: (value) => {
			query.value = value
		},
	})
}
