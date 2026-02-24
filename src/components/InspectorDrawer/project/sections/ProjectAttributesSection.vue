<template>
	<DrawerAttributeGridSection>
		<div v-motion="optionCardHoverMotion">
			<DrawerAttributePopoverCard
				v-model:open="priorityPopoverOpen"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi"
				:trigger-class="`${priorityCardClass} cursor-pointer`">
				<template #trigger>
					<DrawerAttributeCardShell
						:icon-name="priorityIcon"
						:icon-class="priorityIconClass"
						label="Priority"
						:value="priorityLabel"
						:value-class="priorityTextClass" />
				</template>
				<DrawerAttributeOptionList
					:items="priorityOptionItems"
					@select="onPrioritySelectInternal" />
			</DrawerAttributePopoverCard>
		</div>

		<div v-motion="optionCardHoverMotion">
			<DrawerAttributePopoverCard
				v-model:open="statusPopoverOpen"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi"
				:trigger-class="`${statusCardClass} ${statusActionAvailable ? 'cursor-pointer' : 'cursor-default'}`">
				<template #trigger>
					<DrawerAttributeCardShell
						:icon-name="statusIconName"
						:icon-class="statusIconClass"
						label="Status"
						:value="statusLabel"
						:value-class="statusTextClass" />
				</template>
				<DrawerAttributeOptionList
					:items="statusOptionItems"
					empty-text="当前状态暂无可执行操作"
					@select="onStatusActionSelectInternal" />
			</DrawerAttributePopoverCard>
		</div>

		<div v-motion="optionCardHoverMotion">
			<DrawerAttributePopoverCard
				v-model:open="spacePopoverOpen"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi"
				:disabled="isStructureLocked"
				:trigger-class="
					isStructureLocked ? `${spaceCardClass} cursor-not-allowed opacity-70` : `${spaceCardClass} cursor-pointer`
				">
				<template #trigger>
					<DrawerAttributeCardShell
						:icon-name="spaceCardIcon"
						:icon-class="spaceCardLabelClass"
						label="所属 Space"
						:value="currentSpaceLabel"
						:value-class="spaceCardValueClass" />
				</template>
				<DrawerAttributeOptionList
					:items="spaceOptionItems"
					:empty-text="spaceOptionEmptyText"
					@select="onSpaceSelectInternal" />
			</DrawerAttributePopoverCard>
		</div>

		<div v-motion="optionCardHoverMotion">
			<DrawerAttributePopoverCard
				v-model:open="parentPopoverOpen"
				:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
				:ui="drawerPopoverUi"
				:disabled="isStructureLocked"
				:trigger-class="
					isStructureLocked ? `${parentCardClass} cursor-not-allowed opacity-70` : `${parentCardClass} cursor-pointer`
				">
				<template #trigger>
					<DrawerAttributeCardShell
						icon-name="i-lucide-folder-tree"
						:icon-class="currentParentIconClass"
						label="所属 Project"
						:value="currentParentLabel"
						value-class="text-default" />
				</template>
				<DrawerAttributeOptionList
					:items="parentOptionItems"
					@select="onParentSelectInternal" />
			</DrawerAttributePopoverCard>
		</div>
	</DrawerAttributeGridSection>
</template>

<script setup lang="ts">
	import { ref } from 'vue'

	import DrawerAttributeCardShell from '@/components/InspectorDrawer/shared/attributes/DrawerAttributeCardShell.vue'
	import DrawerAttributeOptionList, {
		type DrawerAttributeOptionItem,
	} from '@/components/InspectorDrawer/shared/attributes/DrawerAttributeOptionList.vue'
	import DrawerAttributePopoverCard from '@/components/InspectorDrawer/shared/attributes/DrawerAttributePopoverCard.vue'
	import { DrawerAttributeGridSection } from '@/components/InspectorDrawer/shared/sections'
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import { createDrawerPopoverLayerUi } from '@/config/ui-layer'

	type Props = {
		isStructureLocked: boolean
		priorityCardClass: string
		priorityIconClass: string
		priorityTextClass: string
		priorityIcon: string
		priorityLabel: string
		priorityOptionItems: DrawerAttributeOptionItem[]
		statusCardClass: string
		statusIconName: string
		statusIconClass: string
		statusTextClass: string
		statusLabel: string
		statusActionAvailable: boolean
		statusOptionItems: DrawerAttributeOptionItem[]
		spaceCardIcon: string
		spaceCardClass: string
		spaceCardLabelClass: string
		spaceCardValueClass: string
		currentSpaceLabel: string
		spaceOptionItems: DrawerAttributeOptionItem[]
		spaceOptionEmptyText: string
		parentCardClass: string
		currentParentIconClass: string
		currentParentLabel: string
		parentOptionItems: DrawerAttributeOptionItem[]
		onPrioritySelect: (value: string | number | boolean | null) => void
		onStatusActionSelect: (value: string | number | boolean | null) => void
		onSpaceSelect: (value: string | number | boolean | null) => void | Promise<void>
		onParentSelect: (value: string | number | boolean | null) => void
	}

	const props = defineProps<Props>()

	const drawerPopoverUi = createDrawerPopoverLayerUi()
	const optionCardHoverMotion = useCardHoverMotionPreset()
	const priorityPopoverOpen = ref(false)
	const statusPopoverOpen = ref(false)
	const spacePopoverOpen = ref(false)
	const parentPopoverOpen = ref(false)

	function onPrioritySelectInternal(value: string | number | boolean | null) {
		props.onPrioritySelect(value)
		priorityPopoverOpen.value = false
	}

	function onStatusActionSelectInternal(value: string | number | boolean | null) {
		props.onStatusActionSelect(value)
		statusPopoverOpen.value = false
	}

	async function onSpaceSelectInternal(value: string | number | boolean | null) {
		await props.onSpaceSelect(value)
		spacePopoverOpen.value = false
	}

	function onParentSelectInternal(value: string | number | boolean | null) {
		props.onParentSelect(value)
		parentPopoverOpen.value = false
	}
</script>
