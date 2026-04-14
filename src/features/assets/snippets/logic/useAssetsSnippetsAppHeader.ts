import { useRegisterAppHeader } from '@/app/layout/header'

import SnippetsHeaderActions from '../ui/header/SnippetsHeaderActions.vue'
import SnippetsHeaderSearch from '../ui/header/SnippetsHeaderSearch.vue'

export function useAssetsSnippetsAppHeader() {
	useRegisterAppHeader(
		{
			rightPrimary: SnippetsHeaderSearch,
			rightActions: SnippetsHeaderActions,
			search: 'hide',
		},
		'assets-snippets-app-header',
	)
}
