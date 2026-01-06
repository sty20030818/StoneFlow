<template>
	<section class="space-y-6 max-w-xl">
		<div class="space-y-1">
			<div class="text-lg font-semibold">设置</div>
			<div class="text-sm text-muted">M0：偏好可持久化（plugin-store）。</div>
		</div>

		<div class="space-y-4">
			<div class="grid gap-2">
				<div class="text-sm font-medium text-default">默认首页模式</div>
				<USelect
					:model-value="model.homeView"
					:items="homeViewItems"
					value-key="value"
					class="w-64"
					color="neutral"
					@update:model-value="onHomeViewChange" />
			</div>

			<div class="grid gap-2">
				<div class="text-sm font-medium text-default">信息密度</div>
				<USelect
					:model-value="model.density"
					:items="densityItems"
					value-key="value"
					class="w-64"
					color="neutral"
					@update:model-value="onDensityChange" />
			</div>

			<USwitch
				:model-value="model.autoStart"
				label="创建即开始"
				description="默认开启（M0 只存值，M1 再接时间线规则）。"
				color="neutral"
				@update:model-value="onAutoStartChange" />
		</div>

		<div class="flex items-center gap-2">
			<UModal
				v-model:open="open"
				title="Nuxt UI Modal（M0 验收项）">
				<UButton
					label="打开 Modal"
					color="neutral"
					variant="subtle" />

				<template #body>
					<div class="space-y-3">
						<div class="text-sm text-muted">这里用来验证 Nuxt UI 组件与 overlay 能正常工作。</div>
						<UInput placeholder="随便输入点什么…" />
					</div>
				</template>

				<template #footer>
					<div class="flex justify-end gap-2">
						<UButton
							label="关闭"
							color="neutral"
							variant="outline"
							@click="open = false" />
					</div>
				</template>
			</UModal>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, onMounted, ref } from 'vue'

	import type { SelectItem } from '@nuxt/ui'
	import type { HomeView, InfoDensity } from '@/services/tauri/store'
	import { useSettingsStore } from '@/stores/settings'

	const settingsStore = useSettingsStore()

	const homeViewItems = ref<SelectItem[]>([
		{ label: 'Today', value: 'today' },
		{ label: 'Projects', value: 'projects' },
		{ label: 'Focus（占位）', value: 'focus' },
		{ label: '未完成（Inbox）', value: 'inbox' },
	])

	const densityItems = ref<SelectItem[]>([
		{ label: '舒适', value: 'comfortable' },
		{ label: '紧凑', value: 'compact' },
	])

	const model = computed(() => settingsStore.settings)
	const open = ref(false)

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
