<template>
	<UCard
		v-motion="userCardHoverMotion"
		variant="subtle"
		class="group cursor-default hover:shadow-lg transition-shadow duration-300"
		:ui="{
			root: 'rounded-xl',
			body: 'p-2.5 sm:p-2.5',
		}">
		<div class="flex items-center gap-2.5">
			<UChip
				color="success"
				position="bottom-right"
				inset>
				<UAvatar
					:src="avatarUrl"
					alt="石头鱼"
					size="md"
					:ui="{ root: 'rounded-lg' }" />
			</UChip>

			<div class="flex flex-col flex-1 min-w-0">
				<span class="text-[13px] font-medium text-default truncate">石头鱼</span>
				<span class="text-[11px] text-muted">创建者</span>
			</div>

			<RouterLink
				to="/settings/about"
				class="flex items-center justify-center w-8 h-8 rounded-full text-muted hover:bg-elevated hover:text-default transition-colors duration-200">
				<span v-motion="settingsIconHoverMotion">
					<UIcon
						name="i-lucide-settings"
						class="w-5 h-5" />
				</span>
			</RouterLink>
		</div>
	</UCard>
</template>

<script setup lang="ts">
	import { useActionIconHoverMotion } from '@/composables/base/motion'
	import avatarUrl from '@/assets/avatar.png'

	const userCardHoverMotion = useActionIconHoverMotion({
		hoverY: -1,
		hoverScale: 1.01,
	})
	const settingsIconHoverMotion = useActionIconHoverMotion({ hoverRotate: 90, hoverScale: 1 })
</script>
