<template>
	<header
		class="h-14 shrink-0 border-b border-default px-5 flex items-center justify-between bg-default/80 backdrop-blur-sm">
		<div class="flex items-center gap-3">
			<div
				v-if="pageIcon"
				class="flex items-center justify-center w-9 h-9 rounded-xl bg-elevated/80 shadow-sm ring-1 ring-default/50">
				<UIcon
					:name="pageIcon"
					:class="['size-5', pageIconClass]" />
			</div>
			<div class="flex flex-col gap-0.5">
				<span class="text-[15px] font-semibold text-default leading-tight">{{ pageTitle }}</span>
				<span
					v-if="pageDescription"
					class="text-xs text-muted leading-tight">
					{{ pageDescription }}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				class="gap-1"
				@click="openCommandPalette">
				<UKbd value="meta" />
				<UKbd value="K" />
			</UButton>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed, inject } from 'vue'
	import { useRoute } from 'vue-router'

	import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY } from '@/config/space'

	const route = useRoute()

	const pageTitle = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.label ?? spaceId
		}
		return String(route.meta.title ?? '')
	})

	const pageIcon = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.icon ?? DEFAULT_SPACE_DISPLAY.icon
		}
		return String(route.meta.icon ?? '')
	})

	const pageIconClass = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.iconClass ?? DEFAULT_SPACE_DISPLAY.iconClass
		}
		return String(route.meta.iconClass ?? '')
	})

	const pageDescription = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.description ?? DEFAULT_SPACE_DISPLAY.description
		}
		return String(route.meta.description ?? '')
	})

	const commandPalette = inject<{ open: () => void }>('commandPalette')

	function openCommandPalette() {
		commandPalette?.open()
	}
</script>
