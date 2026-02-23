<template>
	<div class="flex items-center gap-2.5">
		<slot name="icon">
			<UIcon
				:name="iconName"
				class="size-4 shrink-0"
				:class="iconClass" />
		</slot>
		<div class="min-w-0 flex-1">
			<div
				class="mb-1 text-[11px] text-muted"
				:class="labelClass">
				{{ label }}
			</div>
			<div
				class="truncate text-xs font-semibold text-default"
				:class="valueClass">
				<slot name="value">{{ value }}</slot>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	type Props = {
		iconName: string
		label: string
		value?: string
		iconClass?: string
		labelClass?: string
		valueClass?: string
	}

	withDefaults(defineProps<Props>(), {
		value: '',
		iconClass: '',
		labelClass: '',
		valueClass: '',
	})
</script>
