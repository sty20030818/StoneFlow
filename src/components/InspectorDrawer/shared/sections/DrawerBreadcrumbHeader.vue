<template>
	<header
		v-motion="headerMotion"
		class="px-5 py-4 border-b border-default/80 flex items-center justify-between gap-3 shrink-0">
		<div class="flex items-center gap-1.5 min-w-0 flex-1 leading-tight">
			<span
				class="px-2.5 py-1 rounded-full text-[12px] font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
				:class="spacePillClass">
				<UIcon
					:name="currentSpaceIcon"
					class="size-3.5 shrink-0 text-white" />
				<span>{{ currentSpaceLabel }}</span>
			</span>

			<template v-if="projectTrail.length">
				<template
					v-for="(item, index) in projectTrail"
					:key="`${item}-${index}`">
					<span class="text-muted/70 text-[12px] shrink-0">/</span>
					<span
						v-if="index < projectTrail.length - 1"
						class="text-[12px] font-medium text-muted/80 shrink-0 truncate max-w-[140px]">
						{{ item }}
					</span>
					<span
						v-else
						class="text-[14px] font-extrabold text-default truncate min-w-0 flex-1">
						{{ item }}
					</span>
				</template>
			</template>
		</div>

		<div class="flex items-center gap-2 shrink-0">
			<div
				v-if="saveStateVisible"
				v-motion="saveStateMotion"
				class="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
				:class="saveStateClass">
				<span
					class="size-1.5 rounded-full"
					:class="saveStateDotClass"></span>
				<span>{{ saveStateLabel }}</span>
			</div>
			<UButton
				v-if="canRetrySave"
				color="neutral"
				variant="ghost"
				size="xs"
				@click="onRetrySave">
				重试
			</UButton>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { useMotionPreset } from '@/composables/base/motion'

	type Props = {
		currentSpaceLabel: string
		currentSpaceIcon: string
		spacePillClass: string
		projectTrail: string[]
		saveStateVisible: boolean
		saveStateLabel: string
		saveStateClass: string
		saveStateDotClass: string
		canRetrySave: boolean
		onRetrySave: () => void
	}

	defineProps<Props>()
	const headerMotion = useMotionPreset('drawerSection')
	const saveStateMotion = useMotionPreset('statusFeedback')
</script>
