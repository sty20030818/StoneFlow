<template>
	<section class="space-y-6 max-w-xl">
		<PageHeader
			title="设置"
			description="M0：偏好可持久化（plugin-store）。" />

		<PreferenceCard
			:model="model"
			@update:home-view="onHomeViewChange"
			@update:density="onDensityChange"
			@update:auto-start="onAutoStartChange" />

		<ComponentVerify />
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted } from 'vue'

	import type { HomeView, InfoDensity } from '@/services/tauri/store'
	import { useSettingsStore } from '@/stores/settings'

	import PreferenceCard from './components/PreferenceCard.vue'
	import ComponentVerify from './components/ComponentVerify.vue'

	const settingsStore = useSettingsStore()

	const model = computed(() => settingsStore.settings)

	onMounted(async () => {
		await settingsStore.load()
	})

	async function onHomeViewChange(v: unknown) {
		await settingsStore.update({ homeView: v as HomeView })
	}

	async function onDensityChange(v: unknown) {
		await settingsStore.update({ density: v as InfoDensity })
	}

	async function onAutoStartChange(v: boolean) {
		await settingsStore.update({ autoStart: v })
	}
</script>
