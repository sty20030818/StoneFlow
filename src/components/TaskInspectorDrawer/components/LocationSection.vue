<template>
	<section>
		<div class="grid grid-cols-2 gap-3">
			<div v-motion="optionCardHoverMotion">
				<DrawerAttributePopoverCard
					v-model:open="spacePopoverOpen"
					:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
					:ui="drawerPopoverUi"
					:trigger-class="`${spaceCardClass} cursor-pointer`">
					<template #trigger>
						<DrawerAttributeCardShell
							icon-name="i-lucide-orbit"
							:icon-class="spaceCardLabelClass"
							label="所属 Space"
							:value="currentSpaceLabel"
							:label-class="spaceCardLabelClass"
							:value-class="spaceCardValueClass" />
					</template>
					<DrawerAttributeOptionList
						:items="spaceOptionItems"
						@select="onSpaceSelect" />
				</DrawerAttributePopoverCard>
			</div>

			<div v-motion="optionCardHoverMotion">
				<DrawerAttributePopoverCard
					v-model:open="projectPopoverOpen"
					:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
					:ui="drawerPopoverUi"
					trigger-class="cursor-pointer bg-elevated/50 border-default/60 hover:bg-elevated/80">
					<template #trigger>
						<DrawerAttributeCardShell
							icon-name="i-lucide-folder-tree"
							icon-class="text-muted"
							label="所属 Project"
							:value="currentProjectLabel" />
					</template>
					<DrawerAttributeOptionList
						:items="projectOptionItems"
						@select="onProjectSelect" />
				</DrawerAttributePopoverCard>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import DrawerAttributeCardShell from '@/components/DrawerAttributeCard/DrawerAttributeCardShell.vue'
	import DrawerAttributeOptionList, {
		type DrawerAttributeOptionItem,
	} from '@/components/DrawerAttributeCard/DrawerAttributeOptionList.vue'
	import DrawerAttributePopoverCard from '@/components/DrawerAttributeCard/DrawerAttributePopoverCard.vue'
	import { createDrawerPopoverLayerUi } from '@/config/ui-layer'

	type SpaceOption = {
		value: string
		label: string
		icon: string
		iconClass: string
	}

	type ProjectOption = {
		value: string | null
		label: string
		icon: string
		iconClass: string
		depth: number
	}

	type Props = {
		spaceOptions: SpaceOption[]
		projectOptions: ProjectOption[]
		spaceIdLocal: string
		projectIdLocal: string | null
		spaceCardClass: string
		spaceCardLabelClass: string
		spaceCardValueClass: string
		currentSpaceLabel: string
		currentProjectLabel: string
		onSpaceChange: (value: string) => void
		onProjectChange: (value: string | null) => void
	}

	const props = defineProps<Props>()

	const drawerPopoverUi = createDrawerPopoverLayerUi()
	const spacePopoverOpen = ref(false)
	const projectPopoverOpen = ref(false)
	const optionCardHoverMotion = useCardHoverMotionPreset()

	const spaceOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		return props.spaceOptions.map((option) => ({
			value: option.value,
			label: option.label,
			icon: option.icon,
			iconClass: option.iconClass,
			active: props.spaceIdLocal === option.value,
		}))
	})

	const projectOptionItems = computed<DrawerAttributeOptionItem[]>(() => {
		return props.projectOptions.map((option) => ({
			value: option.value,
			label: option.label,
			icon: option.icon,
			iconClass: option.iconClass,
			active: props.projectIdLocal === option.value,
			indentPx: 12 + option.depth * 12,
		}))
	})

	const onSpaceChange = (value: string) => {
		props.onSpaceChange(value)
		spacePopoverOpen.value = false
	}

	const onProjectChange = (value: string | null) => {
		props.onProjectChange(value)
		projectPopoverOpen.value = false
	}

	const onSpaceSelect = (value: string | number | boolean | null) => {
		if (typeof value !== 'string') return
		onSpaceChange(value)
	}

	const onProjectSelect = (value: string | number | boolean | null) => {
		if (value !== null && typeof value !== 'string') return
		onProjectChange(value)
	}
</script>
