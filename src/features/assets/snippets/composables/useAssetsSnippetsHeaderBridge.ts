import { computed, ref, shallowRef } from 'vue'

export type SnippetFilterOption = {
	label: string
	value: string
}

export type SnippetFavoriteFilter = 'all' | 'favorites' | 'unstarred'
export type SnippetSortOption = 'title_asc' | 'created_desc' | 'updated_desc'

const searchKeyword = ref('')
const selectedLanguage = ref('all')
const selectedTag = ref('all')
const selectedFavoriteFilter = ref<SnippetFavoriteFilter>('all')
const selectedSort = ref<SnippetSortOption>('title_asc')

const languageOptions = shallowRef<SnippetFilterOption[]>([])
const tagOptions = shallowRef<SnippetFilterOption[]>([])
const favoriteOptions = shallowRef<SnippetFilterOption[]>([])
const sortOptions = shallowRef<SnippetFilterOption[]>([])
const createSnippetHandler = shallowRef<null | (() => void)>(null)

const hasActiveFilters = computed(() => {
	return (
		selectedLanguage.value !== 'all' ||
		selectedTag.value !== 'all' ||
		selectedFavoriteFilter.value !== 'all' ||
		selectedSort.value !== 'title_asc' ||
		searchKeyword.value.trim().length > 0
	)
})

const activeFilterCount = computed(() => {
	let count = 0
	if (selectedLanguage.value !== 'all') count += 1
	if (selectedTag.value !== 'all') count += 1
	if (selectedFavoriteFilter.value !== 'all') count += 1
	if (selectedSort.value !== 'title_asc') count += 1
	if (searchKeyword.value.trim().length > 0) count += 1
	return count
})

function resetSnippetHeaderFilters() {
	searchKeyword.value = ''
	selectedLanguage.value = 'all'
	selectedTag.value = 'all'
	selectedFavoriteFilter.value = 'all'
	selectedSort.value = 'title_asc'
}

function setSnippetHeaderOptions(input: {
	languageOptions: SnippetFilterOption[]
	tagOptions: SnippetFilterOption[]
	favoriteOptions: SnippetFilterOption[]
	sortOptions: SnippetFilterOption[]
}) {
	languageOptions.value = input.languageOptions
	tagOptions.value = input.tagOptions
	favoriteOptions.value = input.favoriteOptions
	sortOptions.value = input.sortOptions
}

function bindSnippetCreateAction(handler: () => void) {
	createSnippetHandler.value = handler
	return () => {
		if (createSnippetHandler.value === handler) {
			createSnippetHandler.value = null
		}
	}
}

function triggerSnippetCreateAction() {
	createSnippetHandler.value?.()
}

export function useAssetsSnippetsHeaderBridge() {
	return {
		searchKeyword,
		selectedLanguage,
		selectedTag,
		selectedFavoriteFilter,
		selectedSort,
		languageOptions,
		tagOptions,
		favoriteOptions,
		sortOptions,
		hasActiveFilters,
		activeFilterCount,
		resetSnippetHeaderFilters,
		setSnippetHeaderOptions,
		bindSnippetCreateAction,
		triggerSnippetCreateAction,
	}
}
