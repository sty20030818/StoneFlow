<template>
	<div class="h-full flex bg-default text-default">
		<Sidebar v-model:space="space" />

		<div class="flex-1 min-w-0 flex flex-col">
			<Topbar />

			<main class="flex-1 min-h-0 overflow-auto">
				<div class="p-4">
					<div
						v-if="loading"
						class="text-sm text-muted">
						初始化中…
					</div>
					<slot />
				</div>
			</main>
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'

	import Sidebar from './Sidebar.vue'
	import Topbar from './Topbar.vue'

	import { useSettingsStore } from '@/stores/settings'
	import { useSpacesStore } from '@/stores/spaces'

	const toast = useToast()
	const settingsStore = useSettingsStore()
	const spacesStore = useSpacesStore()

	const space = computed({
		get: () => settingsStore.settings.activeSpaceId,
		set: (v) => {
			// computed setter 不能 async，这里 fire-and-forget 即可
			void settingsStore.update({ activeSpaceId: v })
		},
	})

	const loading = ref(false)

	onMounted(async () => {
		try {
			loading.value = true
			await settingsStore.load()
			await spacesStore.load()
		} catch (e) {
			toast.add({
				title: '初始化失败',
				description: e instanceof Error ? e.message : '未知错误',
				color: 'error',
			})
		} finally {
			loading.value = false
		}
	})
</script>
