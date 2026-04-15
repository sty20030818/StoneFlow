<template>
	<div
		data-tauri-drag-region
		class="app-desktop-drag flex min-w-0 max-w-full items-center gap-2">
		<RouterLink
			v-if="leadingPill?.to"
			:to="leadingPill.to"
			:class="['app-desktop-no-drag', HEADER_CAPSULE_BASE, leadingPill.pillClass]">
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
					:class="['app-desktop-no-drag', HEADER_CAPSULE_BASE, pillClass(index)]">
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
					data-tauri-drag-region
					class="app-desktop-drag text-base font-bold text-default flex max-w-100 items-baseline gap-2 truncate">
					<span
						v-if="item.icon"
						data-tauri-drag-region
						class="app-desktop-drag inline-flex items-center gap-2">
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
	import { HEADER_CAPSULE_BASE, HEADER_CAPSULE_ICON } from '@/shared/config/ui/capsule'

	import type { AppHeaderBreadcrumbItem, AppHeaderLeadingPill } from './types'

	defineProps<{
		leadingPill: AppHeaderLeadingPill | null
		items: readonly AppHeaderBreadcrumbItem[]
		pillClass: (index: number) => string
	}>()
</script>
