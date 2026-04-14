<template>
	<UModal
		v-model:open="openModel"
		:title="title || undefined"
		:description="description || undefined"
		:close="close"
		:content="contentProps"
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
	import { computed } from 'vue'

	import { createModalLayerUi } from '@/shared/config/ui-layer'

	type Props = {
		title?: string
		description?: string
		close?: boolean
		preventAutoFocus?: boolean
	}

	const props = withDefaults(defineProps<Props>(), {
		title: '',
		description: '',
		close: true,
		preventAutoFocus: false,
	})

	const openModel = defineModel<boolean>('open', {
		default: false,
	})

	const contentProps = computed(() => {
		if (!props.preventAutoFocus) {
			return undefined
		}

		return {
			onOpenAutoFocus: (event: Event) => {
				event.preventDefault()
			},
		}
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
		min-height: 0;
		padding-top: 0.2rem;
		overflow: hidden;
	}

	.asset-workbench-modal__footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
	}
</style>
