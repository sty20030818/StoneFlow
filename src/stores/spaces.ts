import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { SpaceDto } from '@/services/api/spaces'
import { listSpaces } from '@/services/api/spaces'

export const useSpacesStore = defineStore('spaces', () => {
	const loaded = ref(false)
	const spaces = ref<SpaceDto[]>([])

	async function load() {
		spaces.value = await listSpaces()
		loaded.value = true
	}

	return {
		loaded,
		spaces,
		load,
	}
})
