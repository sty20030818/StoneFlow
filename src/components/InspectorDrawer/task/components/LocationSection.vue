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
							:label="t('inspector.attribute.space')"
							:value="currentSpaceLabel"
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
					:trigger-class="`${projectCardClass} cursor-pointer`">
					<template #trigger>
						<DrawerAttributeCardShell
							icon-name="i-lucide-folder-tree"
							:icon-class="projectIconClass"
							:label="t('inspector.attribute.project')"
							:value="currentProjectLabel"
							value-class="text-default" />
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
	import { useI18n } from 'vue-i18n'
	import { computed, ref } from 'vue'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import DrawerAttributeCardShell from '@/components/InspectorDrawer/shared/attributes/DrawerAttributeCardShell.vue'
	import DrawerAttributeOptionList, {
		type DrawerAttributeOptionItem,
	} from '@/components/InspectorDrawer/shared/attributes/DrawerAttributeOptionList.vue'
	import DrawerAttributePopoverCard from '@/components/InspectorDrawer/shared/attributes/DrawerAttributePopoverCard.vue'
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
	const { t } = useI18n({ useScope: 'global' })
	const PROJECT_LEVEL_CARD_CLASSES = [
		'bg-amber-50/40 border-amber-200 hover:bg-amber-50/60',
		'bg-sky-50/40 border-sky-200 hover:bg-sky-50/60',
		'bg-violet-50/40 border-violet-200 hover:bg-violet-50/60',
		'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/60',
		'bg-rose-50/40 border-rose-200 hover:bg-rose-50/60',
	] as const
	const FALLBACK_PROJECT_CARD_CLASS = PROJECT_LEVEL_CARD_CLASSES[0]

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

	const currentProjectOption = computed(() => {
		if (props.projectIdLocal !== null) {
			return props.projectOptions.find((option) => option.value === props.projectIdLocal) ?? null
		}
		return (
			props.projectOptions.find((option) => typeof option.value === 'string' && option.value.endsWith('_default')) ??
			null
		)
	})

	const projectCardClass = computed(() => {
		const option = currentProjectOption.value
		if (!option) return FALLBACK_PROJECT_CARD_CLASS
		return PROJECT_LEVEL_CARD_CLASSES[Math.min(option.depth, PROJECT_LEVEL_CARD_CLASSES.length - 1)]
	})

	const projectIconClass = computed(() => currentProjectOption.value?.iconClass ?? 'text-amber-500')
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
