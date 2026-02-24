<template>
	<section>
		<div class="mb-2 flex items-center justify-between">
			<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">{{ label }}</label>
			<button
				v-if="showAddButton"
				type="button"
				class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-default/60 bg-elevated/60 text-sm font-semibold text-muted transition-colors hover:bg-elevated"
				:aria-label="addAriaLabel"
				@click="onAddClick">
				+
			</button>
		</div>
		<div class="grid grid-cols-2 gap-3">
			<slot></slot>
		</div>
	</section>
</template>

<script setup lang="ts">
	type Props = {
		label?: string
		showAddButton?: boolean
		addAriaLabel?: string
	}

	const props = withDefaults(defineProps<Props>(), {
		label: '属性',
		showAddButton: false,
		addAriaLabel: '新增字段',
	})

	const emit = defineEmits<{
		add: []
	}>()

	function onAddClick() {
		if (!props.showAddButton) return
		emit('add')
	}
</script>
