<template>
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
</template>

<script setup lang="ts">
	import { ref } from 'vue'

	const open = ref(false)
</script>
