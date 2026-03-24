import { useRegisterShellHeader } from '@/app/shell-header'

import SnippetsHeaderActions from '../ui/header/SnippetsHeaderActions.vue'
import SnippetsHeaderSearch from '../ui/header/SnippetsHeaderSearch.vue'

export function useAssetsSnippetsShellHeader() {
	useRegisterShellHeader(
		{
			rightPrimary: SnippetsHeaderSearch,
			rightActions: SnippetsHeaderActions,
			search: 'hide',
		},
		'assets-snippets-shell',
	)
}
