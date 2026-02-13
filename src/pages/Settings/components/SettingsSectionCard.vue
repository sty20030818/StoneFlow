<template>
	<UCard
		:class="mergedClass"
		:ui="cardUi">
		<template
			v-if="hasHeader"
			#header>
			<slot name="header">
				<div class="space-y-1">
					<div class="text-sm font-semibold text-default">{{ title }}</div>
					<div
						v-if="description"
						class="text-xs text-muted">
						{{ description }}
					</div>
				</div>
			</slot>
		</template>

		<slot />
	</UCard>
</template>

<script setup lang="ts">
	import { computed, useSlots } from 'vue'

	const props = withDefaults(
		defineProps<{
			title?: string
			description?: string
			cardClass?: string
		}>(),
		{
			title: '',
			description: '',
			cardClass: '',
		},
	)

	const slots = useSlots()

	const hasHeader = computed(() => Boolean(props.title || slots.header))

	const cardUi = {
		header: 'px-4 py-3 sm:px-5 sm:py-4',
		body: 'px-4 py-4 sm:px-5 sm:py-5',
	}

	const mergedClass = computed(() => ['rounded-3xl border border-default/70 bg-default', props.cardClass])
</script>
