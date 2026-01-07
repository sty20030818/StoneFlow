<template>
	<section class="space-y-6 max-w-xl">
		<PageHeader
			title="设置"
			description="M0：偏好可持久化（plugin-store）。" />

		<UCard class="space-y-4">
			<UFormField
				label="默认首页模式"
				description="启动时默认显示的页面">
				<USelect
					:model-value="model.homeView"
					:items="homeViewItems"
					value-key="value"
					class="w-64"
					color="neutral"
					@update:model-value="onHomeViewChange" />
			</UFormField>

			<UFormField
				label="信息密度"
				description="界面布局的紧凑程度">
				<USelect
					:model-value="model.density"
					:items="densityItems"
					value-key="value"
					class="w-64"
					color="neutral"
					@update:model-value="onDensityChange" />
			</UFormField>

			<USwitch
				:model-value="model.autoStart"
				label="创建即开始"
				description="默认开启（M0 只存值，M1 再接时间线规则）。"
				color="neutral"
				@update:model-value="onAutoStartChange" />
		</UCard>

		<UCard>
			<template #header>
				<div class="text-sm font-medium">组件验证</div>
			</template>
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
		</UCard>
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
