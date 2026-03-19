<template>
	<div class="flex items-center gap-2 min-w-0 flex-1">
		<RouterLink
			v-if="leadingPill?.to"
			:to="leadingPill.to"
			:class="[HEADER_CAPSULE_BASE, leadingPill.pillClass]">
			<UIcon
				:name="leadingPill.icon"
				:class="HEADER_CAPSULE_ICON" />
			<span>{{ leadingPill.label }}</span>
		</RouterLink>
		<span
			v-else-if="leadingPill"
			:class="[HEADER_CAPSULE_BASE, leadingPill.pillClass]">
			<UIcon
				:name="leadingPill.icon"
				:class="HEADER_CAPSULE_ICON" />
			<span>{{ leadingPill.label }}</span>
		</span>

		<template v-if="items.length">
			<template
				v-for="(item, index) in items"
				:key="`${item.label}-${index}`">
				<UIcon
					name="i-lucide-chevron-right"
					class="size-3.5 text-muted shrink-0" />
				<RouterLink
					v-if="index < items.length - 1 && item.to"
					:to="item.to"
					:class="[HEADER_CAPSULE_BASE, pillClass(index)]">
					<UIcon
						v-if="item.icon"
						:name="item.icon"
						:class="HEADER_CAPSULE_ICON" />
					<span class="truncate max-w-40">{{ item.label }}</span>
				</RouterLink>
				<span
					v-else-if="index < items.length - 1"
					:class="[HEADER_CAPSULE_BASE, pillClass(index)]">
					<UIcon
						v-if="item.icon"
						:name="item.icon"
						:class="HEADER_CAPSULE_ICON" />
					<span class="truncate max-w-40">{{ item.label }}</span>
				</span>
				<span
					v-else
					class="text-base font-bold text-default truncate max-w-100 flex items-baseline gap-2">
					<span
						v-if="item.icon"
						class="inline-flex items-center gap-2">
						<UIcon
							:name="item.icon"
							class="size-4 text-muted" />
						<span>{{ item.label }}</span>
					</span>
					<span v-else>{{ item.label }}</span>

					<span
						v-if="item.description"
						class="text-xs font-normal text-muted truncate max-w-75">
						{{ item.description }}
					</span>
				</span>
			</template>
		</template>
	</div>
</template>

<script setup lang="ts">
	import type { ShellHeaderBreadcrumbItem } from '@/app/shell-header'
	import { HEADER_CAPSULE_BASE, HEADER_CAPSULE_ICON } from '@/config/ui/capsule'

	import type { AppHeaderLeadingPill } from './types'

	defineProps<{
		leadingPill: AppHeaderLeadingPill | null
		items: readonly ShellHeaderBreadcrumbItem[]
		pillClass: (index: number) => string
	}>()
</script>
