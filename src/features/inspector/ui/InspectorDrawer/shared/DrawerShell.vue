<template>
	<USlideover
		v-model:open="openModel"
		:title="title"
		:description="description"
		side="right"
		:content="props.content"
		:ui="drawerUi"
		:close="false">
		<template #content>
			<slot></slot>
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { createDrawerLayerUi } from '@/config/ui-layer'
	import { DRAWER_CONTENT_CLASS } from './constants'

	const openModel = defineModel<boolean>('open', { required: true })

	type Props = {
		title: string
		description: string
		contentClass?: string
		content?: Record<string, unknown>
	}

	const props = defineProps<Props>()

	const drawerUi = createDrawerLayerUi({
		content: props.contentClass ?? DRAWER_CONTENT_CLASS,
	})
</script>
