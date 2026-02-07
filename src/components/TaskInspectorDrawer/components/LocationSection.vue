<template>
	<section class="space-y-2">
		<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">位置分类</label>
		<div class="grid grid-cols-2 gap-3">
			<UPopover
				:mode="'click'"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi">
				<button
					type="button"
					class="p-4 rounded-2xl border transition-all text-left w-full cursor-pointer"
					:class="spaceCardClass">
					<div class="flex items-center justify-between">
						<div class="flex flex-col gap-1">
							<span
								class="text-[10px] font-bold uppercase tracking-wider"
								:class="spaceCardLabelClass">
								所属 Space
							</span>
							<span
								class="text-sm font-bold"
								:class="spaceCardValueClass">
								{{ currentSpaceLabel }}
							</span>
						</div>
						<UIcon
							name="i-lucide-chevron-right"
							class="size-4"
							:class="spaceCardLabelClass" />
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
				:mode="'click'"
				:popper="{ strategy: 'fixed', placement: 'bottom-end' }"
				:ui="drawerPopoverUi">
				<button
					type="button"
					class="p-4 rounded-2xl bg-elevated/50 border border-default/60 hover:bg-elevated/80 transition-all text-left w-full cursor-pointer">
					<div class="flex items-center justify-between">
						<div class="flex flex-col gap-1">
							<span class="text-[10px] font-bold text-muted uppercase tracking-wider">所属 Project</span>
							<span class="text-sm font-bold text-default truncate max-w-[120px]">
								{{ currentProjectLabel }}
							</span>
						</div>
						<UIcon
							name="i-lucide-chevron-right"
							class="size-4 text-muted" />
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

	defineProps<Props>()

	const drawerPopoverUi = createDrawerPopoverLayerUi()
</script>
