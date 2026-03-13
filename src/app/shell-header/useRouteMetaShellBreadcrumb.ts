import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import { useRegisterShellHeader } from './use-shell-header'

function resolveMetaText(
	t: ReturnType<typeof useI18n>['t'],
	meta: Record<string, unknown> | undefined,
	field: 'title' | 'description',
) {
	const keyField = field === 'title' ? 'titleKey' : 'descriptionKey'
	const fromKey = meta?.[keyField]
	if (typeof fromKey === 'string') return t(fromKey)
	const direct = meta?.[field]
	return typeof direct === 'string' ? direct : null
}

function isPageLeadingMode(value: unknown) {
	return value === 'page'
}

/**
 * 为普通页面注册当前叶子路由的 breadcrumb。
 * Header 本身只负责渲染，不再内置页面路径特判。
 */
export function useRouteMetaShellBreadcrumb(source = 'route-meta-breadcrumb') {
	const route = useRoute()
	const { t } = useI18n({ useScope: 'global' })

	useRegisterShellHeader(
		computed(() => {
			const leafRecord = [...route.matched].reverse().find((record) => {
				const title = resolveMetaText(t, record.meta as Record<string, unknown> | undefined, 'title')
				return typeof title === 'string'
			})

			if (!leafRecord) {
				return {
					breadcrumb: [],
				}
			}

			if (isPageLeadingMode(leafRecord.meta?.leadingMode)) {
				return {
					breadcrumb: [],
				}
			}

			const label = resolveMetaText(t, leafRecord.meta as Record<string, unknown> | undefined, 'title')
			if (typeof label !== 'string') {
				return {
					breadcrumb: [],
				}
			}

			const description = resolveMetaText(t, leafRecord.meta as Record<string, unknown> | undefined, 'description')
			const icon = typeof leafRecord.meta?.icon === 'string' ? leafRecord.meta.icon : undefined

			return {
				breadcrumb: [
					{
						label,
						description: typeof description === 'string' ? description : undefined,
						icon,
					},
				],
			}
		}),
		source,
	)
}
