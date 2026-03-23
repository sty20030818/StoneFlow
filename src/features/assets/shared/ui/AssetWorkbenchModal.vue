<template>
	<UModal
		v-model:open="openModel"
		:title="title"
		:description="description"
		:ui="modalUi">
		<template #body>
			<section class="asset-workbench-modal__body">
				<slot />
			</section>
		</template>

		<template #footer>
			<footer class="asset-workbench-modal__footer">
				<slot name="footer" />
			</footer>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { createModalLayerUi } from '@/config/ui-layer'

	type Props = {
		title: string
		description?: string
	}

	defineProps<Props>()

	const openModel = defineModel<boolean>('open', {
		default: false,
	})

	const modalUi = createModalLayerUi({
		width: 'sm:max-w-6xl',
		rounded: 'rounded-[2rem]',
		content:
			'border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.95))] shadow-[0_32px_80px_rgba(15,23,42,0.16)]',
	})
</script>

<style scoped>
	.asset-workbench-modal__body {
		padding-top: 0.4rem;
	}

	.asset-workbench-modal__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
	}
</style>
