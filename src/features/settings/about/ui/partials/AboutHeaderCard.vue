<template>
	<SettingsSectionCard>
		<div class="space-y-5">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-start gap-4">
					<UAvatar
						:src="avatarUrl"
						:alt="t('app.name')"
						size="xl"
						:ui="{ root: 'rounded-2xl ring-1 ring-default/50 bg-elevated/60' }" />
					<div class="space-y-4">
						<div class="space-y-2">
							<div class="text-2xl font-semibold text-default">{{ appName }}</div>
							<div class="text-sm text-muted">{{ t('settings.about.header.subtitle') }}</div>
						</div>
						<div class="space-y-2 text-xs text-muted">
							<div class="flex items-start gap-2">
								<UIcon
									name="i-lucide-flag"
									class="mt-0.5 size-3.5 text-primary/80" />
								<span>{{ t('settings.about.header.bullets.taskProject') }}</span>
							</div>
							<div class="flex items-start gap-2">
								<UIcon
									name="i-lucide-check-circle-2"
									class="mt-0.5 size-3.5 text-primary/80" />
								<span>{{ t('settings.about.header.bullets.finishList') }}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="w-full max-w-md">
					<div class="rounded-3xl border border-default/60 bg-elevated/50 p-4">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1">
								<div class="text-xs text-muted">{{ t('settings.about.header.currentVersion') }}</div>
								<div class="text-lg font-semibold text-default">v{{ currentVersion }}</div>
								<div
									v-if="buildNumber"
									class="text-xs text-muted">
									Build {{ buildNumber }}
								</div>
								<div class="text-xs text-muted">
									{{ t('settings.about.header.lastChecked', { text: lastCheckedText }) }}
								</div>
							</div>
							<UBadge
								color="neutral"
								variant="soft">
								{{ updateStateLabel }}
							</UBadge>
						</div>
						<div class="mt-3 flex flex-wrap gap-2">
							<UButton
								color="primary"
								icon="i-lucide-refresh-cw"
								:loading="isChecking"
								:disabled="isDownloading"
								@click="onCheckUpdate">
								{{ t('settings.about.actions.checkUpdate') }}
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								icon="i-lucide-external-link"
								@click="onOpenReleasePage">
								{{ t('settings.about.actions.openReleasePage') }}
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								icon="i-lucide-scroll-text"
								@click="onOpenChangelog">
								{{ t('settings.about.actions.openChangelog') }}
							</UButton>
						</div>
					</div>
				</div>
			</div>

			<div class="space-y-4">
				<div
					v-if="state.error"
					class="rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
					{{ state.error }}
				</div>

				<div
					v-if="state.status === 'downloading'"
					class="space-y-2">
					<div class="flex items-center justify-between text-sm text-muted">
						<span>{{ t('settings.about.updateState.downloading') }}</span>
						<span>{{ downloadProgressText }}</span>
					</div>
					<UProgress
						:model-value="downloadProgressValue"
						color="primary"
						:ui="progressUi" />
				</div>

				<div class="flex flex-wrap gap-2">
					<UButton
						v-if="showDownloadAction"
						color="neutral"
						variant="soft"
						icon="i-lucide-download"
						:loading="isDownloading"
						@click="onDownloadUpdate">
						{{ t('settings.about.actions.downloadUpdate') }}
					</UButton>
					<UButton
						v-if="state.status === 'ready'"
						color="neutral"
						variant="soft"
						icon="i-lucide-rotate-cw"
						@click="onRestart">
						{{ t('settings.about.actions.restartInstall') }}
					</UButton>
				</div>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'
	import type { UpdateState } from '@/features/system/updater/logic/useUpdater'
	import avatarUrl from '@/assets/avatar.png'
	import { SettingsSectionCard } from '../../../shared'

	const { t } = useI18n({ useScope: 'global' })

	const props = defineProps<{
		appName: string
		currentVersion: string
		buildNumber: string
		lastCheckedText: string
		updateStateLabel: string
		state: UpdateState
		isChecking: boolean
		isDownloading: boolean
		onCheckUpdate: () => void
		onDownloadUpdate: () => void
		onRestart: () => void
		onOpenReleasePage: () => void
		onOpenChangelog: () => void
	}>()

	const progressUi = {
		base: 'overflow-hidden rounded-full border border-default/60 bg-elevated/60',
		indicator: 'rounded-full transition-[transform] duration-300 ease-out',
	}

	const showDownloadAction = computed(() => props.state.available && props.state.status !== 'ready')
	const downloadProgressValue = computed(() => props.state.progress)
	const downloadProgressText = computed(() => `${props.state.progress}%`)
</script>
