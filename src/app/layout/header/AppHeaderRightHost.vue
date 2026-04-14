<template>
	<div class="flex items-center gap-2 shrink-0">
		<component
			:is="rightPrimaryComponent"
			v-if="rightPrimaryComponent" />
		<GlobalHeaderSearch v-else-if="showDefaultSearch" />

		<component
			:is="rightActionsComponent"
			v-if="rightActionsComponent" />

		<template v-if="hasEditBridge">
			<button
				type="button"
				v-motion="editButtonMotion"
				class="ml-1"
				:class="[HEADER_CAPSULE_BASE, editButtonClass]"
				@click="onToggleEditMode">
				<UIcon
					:name="editButtonIcon"
					:class="[HEADER_CAPSULE_ICON, editButtonIconClass]" />
				<span>{{ editButtonLabel }}</span>
			</button>
		</template>
	</div>
</template>

<script setup lang="ts">
	import type { Component } from 'vue'
	import { HEADER_CAPSULE_BASE, HEADER_CAPSULE_ICON } from '@/shared/config/ui/capsule'

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
