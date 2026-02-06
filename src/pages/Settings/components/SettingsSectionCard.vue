<template>
	<UCard :class="mergedClass">
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

	const mergedClass = computed(() => ['rounded-3xl border border-default/70 bg-default', props.cardClass])
</script>
