<template>
	<section>
		<div class="grid grid-cols-2 gap-3">
			<UPopover
				v-model:open="spacePopoverOpen"
				:mode="'click'"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi">
				<button
					v-motion="optionCardHoverMotion"
					type="button"
					class="p-4 rounded-2xl border transition-colors text-left w-full cursor-pointer"
					:class="spaceCardClass">
					<div class="flex items-center gap-2.5">
						<UIcon
							name="i-lucide-orbit"
							class="size-4 shrink-0"
							:class="spaceCardLabelClass" />
						<div class="min-w-0 flex-1">
							<div
								class="text-[11px] mb-1"
								:class="spaceCardLabelClass">
								所属 Space
							</div>
							<div
								class="text-xs font-semibold truncate"
								:class="spaceCardValueClass">
								{{ currentSpaceLabel }}
							</div>
						</div>
					</div>
				</button>
				<template #content>
					<div class="p-2 min-w-[180px]">
						<div
							v-for="space in spaceOptions"
							:key="space.value"
							class="px-3 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
							:class="{ 'bg-elevated': spaceIdLocal === space.value }"
							@click="onSpaceChange(space.value)">
							<div class="flex items-center gap-2">
								<UIcon
									:name="space.icon"
									class="size-4 shrink-0"
									:class="space.iconClass" />
								<span class="text-sm font-medium">{{ space.label }}</span>
							</div>
						</div>
					</div>
				</template>
			</UPopover>

			<UPopover
				v-model:open="projectPopoverOpen"
				:mode="'click'"
				:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
				:ui="drawerPopoverUi">
				<button
					v-motion="optionCardHoverMotion"
					type="button"
					class="p-4 rounded-2xl border transition-colors text-left w-full cursor-pointer bg-elevated/50 border-default/60 hover:bg-elevated/80">
					<div class="flex items-center gap-2.5">
						<UIcon
							name="i-lucide-folder-tree"
							class="size-4 shrink-0 text-muted" />
						<div class="min-w-0 flex-1">
							<div class="text-[11px] text-muted mb-1">所属 Project</div>
							<div class="text-xs font-semibold text-default truncate">
								{{ currentProjectLabel }}
							</div>
						</div>
					</div>
				</button>
				<template #content>
					<div class="p-2 min-w-[220px] max-h-[300px] overflow-y-auto">
						<div
							v-for="project in projectOptions"
							:key="project.value ?? 'uncategorized'"
							class="px-3 py-2 rounded-lg hover:bg-elevated cursor-pointer transition-colors"
							:class="{ 'bg-elevated': projectIdLocal === project.value }"
							:style="{ paddingLeft: `${12 + project.depth * 12}px` }"
							@click="onProjectChange(project.value)">
							<div class="flex items-center gap-2">
								<UIcon
									:name="project.icon"
									class="size-4 shrink-0"
									:class="project.iconClass" />
								<span class="text-sm truncate">{{ project.label }}</span>
							</div>
						</div>
					</div>
				</template>
			</UPopover>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { ref } from 'vue'

	import { useCardHoverMotionPreset } from '@/composables/base/motion'
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

	const onSpaceChange = (value: string) => {
		props.onSpaceChange(value)
		spacePopoverOpen.value = false
	}

	const onProjectChange = (value: string | null) => {
		props.onProjectChange(value)
		projectPopoverOpen.value = false
	}
</script>
