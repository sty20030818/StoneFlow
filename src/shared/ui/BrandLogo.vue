<template>
	<div class="flex items-center justify-between gap-3 px-2 py-2">
		<div class="flex min-w-0 items-center gap-3">
			<div
				v-motion="logoAvatarHoverMotion"
				class="shrink-0">
				<UChip
					color="success"
					position="bottom-right"
					inset>
					<UAvatar
						:src="avatarUrl"
						alt="StoneFlow"
						size="lg"
						:ui="{
							root: 'rounded-xl shadow-[0_4px_12px_-2px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_24px_-14px_rgba(15,23,42,0.72)]',
						}" />
				</UChip>
			</div>
			<div class="flex min-w-0 flex-col gap-0.5">
				<span class="text-sm font-semibold text-default tracking-tight">StoneFlow</span>
				<span class="text-[11px] text-muted">v0.1.6</span>
			</div>
		</div>

		<div v-motion="themeButtonHoverMotion">
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				square
				:icon="currentIcon"
				:aria-label="themeActionLabel"
				:title="themeActionLabel"
				:ui="{
					base: 'rounded-xl',
					leadingIcon: 'size-4',
				}"
				@click="void cyclePreference()" />
		</div>
	</div>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { useAppTheme } from '@/app/logic/useAppTheme'
	import { useActionIconHoverMotion } from '@/shared/composables/base/motion'
	import avatarUrl from '@/assets/stoneflow.png'

	const { t } = useI18n({ useScope: 'global' })
	const { currentIcon, nextPreference, cyclePreference } = useAppTheme()
	const logoAvatarHoverMotion = useActionIconHoverMotion({ hoverScale: 1.05 })
	const themeButtonHoverMotion = useActionIconHoverMotion({ hoverScale: 1.08 })
	const themeActionLabel = computed(() => t('theme.switchTo', { mode: t(`theme.modes.${nextPreference.value}`) }))
</script>
