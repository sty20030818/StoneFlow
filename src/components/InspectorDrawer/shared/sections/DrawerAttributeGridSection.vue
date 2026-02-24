<template>
	<section>
		<div class="mb-2 flex items-center justify-between">
			<label class="text-xs font-semibold text-muted uppercase tracking-widest">{{ resolvedLabel }}</label>
			<button
				v-if="showAddButton"
				type="button"
				class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-default/60 bg-elevated/60 text-sm font-semibold text-muted transition-colors hover:bg-elevated"
				:aria-label="resolvedAddAriaLabel"
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
import { useI18n } from 'vue-i18n'
	import { computed } from 'vue'

	type Props = {
		label?: string
		showAddButton?: boolean
		addAriaLabel?: string
	}

	const props = withDefaults(defineProps<Props>(), {
		label: undefined,
		showAddButton: false,
		addAriaLabel: undefined,
	})
	const { t } = useI18n({ useScope: 'global' })
	const resolvedLabel = computed(() => props.label ?? t('inspector.attribute.label'))
	const resolvedAddAriaLabel = computed(() => props.addAriaLabel ?? t('inspector.attribute.addAria'))

	const emit = defineEmits<{
		add: []
	}>()

	function onAddClick() {
		if (!props.showAddButton) return
		emit('add')
	}
</script>
