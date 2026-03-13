<template>
	<div class="flex items-center gap-2 shrink-0">
		<component
			:is="rightActionsComponent"
			v-if="rightActionsComponent" />

		<component
			:is="rightPrimaryComponent"
			v-if="rightPrimaryComponent" />
		<GlobalHeaderSearch v-else-if="showDefaultSearch" />

		<template v-if="hasEditBridge">
			<button
				type="button"
				v-motion="editButtonMotion"
				class="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-sm"
				:class="editButtonClass"
				@click="onToggleEditMode">
				<UIcon
					:name="editButtonIcon"
					class="size-3.5"
					:class="editButtonIconClass" />
				<span>{{ editButtonLabel }}</span>
			</button>
		</template>
	</div>
</template>

<script setup lang="ts">
	import type { Component } from 'vue'

	import GlobalHeaderSearch from './GlobalHeaderSearch.vue'

	defineProps<{
		rightActionsComponent: Component | null
		rightPrimaryComponent: Component | null
		showDefaultSearch: boolean
		hasEditBridge: boolean
		editButtonMotion: Record<string, unknown>
		editButtonLabel: string
		editButtonIcon: string
		editButtonClass: string
		editButtonIconClass: string
	}>()

	const emit = defineEmits<{
		toggleEdit: []
	}>()

	function onToggleEditMode() {
		emit('toggleEdit')
	}
</script>
