<template>
	<SettingsSectionCard card-class="bg-default">
		<template #header>
			<div class="flex items-start justify-between gap-3">
				<div class="min-w-0">
					<div class="text-sm font-semibold text-default">{{ t('settings.remoteSync.autoSync.title') }}</div>
				</div>
				<USwitch
					:model-value="props.syncPreferences.enabled"
					:disabled="!props.hasActiveProfile"
					size="lg"
					@update:model-value="props.onUpdateAutoSyncEnabled" />
			</div>
		</template>

		<div class="space-y-3">
			<div
				class="space-y-3 rounded-2xl border border-default/70 bg-elevated/20 px-3 py-3 transition-opacity"
				:class="props.hasActiveProfile ? '' : 'opacity-70'">
				<div class="rounded-2xl border border-default/70 bg-default px-3 py-3">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="text-sm font-medium text-default">{{ t('settings.remoteSync.autoSync.runOnAppStart') }}</div>
							<div class="mt-0.5 text-[11px] leading-5 text-muted/80">
								{{ t('settings.remoteSync.autoSync.runOnAppStartDescription') }}
							</div>
						</div>
						<USwitch
							:model-value="props.syncPreferences.runOnAppStart"
							:disabled="!props.hasActiveProfile || !props.syncPreferences.enabled"
							@update:model-value="props.onUpdateAutoSyncRunOnAppStart" />
					</div>
				</div>

				<div class="rounded-2xl border border-default/70 bg-default px-3 py-3">
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<div class="text-sm font-medium text-default">{{ t('settings.remoteSync.autoSync.interval') }}</div>
							<div class="mt-0.5 text-[11px] leading-5 text-muted/80">
								{{ t('settings.remoteSync.autoSync.intervalDescription') }}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<UPopover
								v-model:open="intervalPopoverOpen"
								:ui="popoverUi">
								<UButton
									color="neutral"
									variant="soft"
									size="sm"
									icon="i-lucide-clock-3"
									trailing-icon="i-lucide-chevron-down"
									:disabled="!props.hasActiveProfile || !props.syncPreferences.enabled || !props.syncPreferences.runOnInterval">
									{{ intervalLabel }}
								</UButton>

								<template #content>
									<div class="w-44 rounded-xl border border-default/60 bg-default p-1.5 shadow-lg">
										<button
											v-for="option in props.autoSyncIntervalOptions"
											:key="`interval-${option.value}`"
											class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-elevated/60"
											type="button"
											@click="handleSelectInterval(option.value)">
											<span>{{ option.label }}</span>
											<UIcon
												v-if="option.value === props.syncPreferences.intervalMinutes"
												name="i-lucide-check"
												class="h-4 w-4 text-primary" />
										</button>
									</div>
								</template>
							</UPopover>

							<USwitch
								:model-value="props.syncPreferences.runOnInterval"
								:disabled="!props.hasActiveProfile || !props.syncPreferences.enabled"
								@update:model-value="props.onUpdateAutoSyncRunOnInterval" />
						</div>
					</div>
				</div>

			</div>

			<div class="rounded-2xl border border-default/70 bg-elevated/20 px-3 py-3">
				<button
					class="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1 text-left transition-colors hover:bg-default/60"
					type="button"
					@click="toggleAdvanced">
					<div>
						<div class="text-sm font-medium text-default">{{ t('settings.remoteSync.autoSync.advancedTitle') }}</div>
						<div class="mt-0.5 text-[11px] leading-5 text-muted/80">
							{{ t('settings.remoteSync.autoSync.retryCountDescription') }}
						</div>
					</div>
					<div class="flex items-center gap-1 text-[10px] text-muted">
						<div>{{ showAdvanced ? t('settings.remoteSync.autoSync.hideAdvanced') : t('settings.remoteSync.autoSync.showAdvanced') }}</div>
						<UIcon
							name="i-lucide-chevron-down"
							class="h-4 w-4 transition-transform"
							:class="showAdvanced ? 'rotate-180' : ''" />
					</div>
				</button>

				<div
					v-if="showAdvanced"
					class="mt-3 rounded-xl border border-default/70 bg-default px-3 py-2.5">
					<div class="flex items-center justify-between gap-3">
						<div>
							<div class="text-[10px] text-muted">{{ t('settings.remoteSync.autoSync.retryCount') }}</div>
							<div class="mt-0.5 text-[11px] text-default">{{ retryLabel }}</div>
						</div>

						<UPopover
							v-model:open="retryPopoverOpen"
							:ui="popoverUi">
							<UButton
								color="neutral"
								variant="soft"
								size="sm"
								icon="i-lucide-rotate-cw"
								trailing-icon="i-lucide-chevron-down"
								:disabled="!props.hasActiveProfile || !props.syncPreferences.enabled">
								{{ retryLabel }}
							</UButton>

							<template #content>
								<div class="w-40 rounded-xl border border-default/60 bg-default p-1.5 shadow-lg">
									<button
										v-for="option in props.autoSyncRetryOptions"
										:key="`retry-${option.value}`"
										class="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-elevated/60"
										type="button"
										@click="handleSelectRetry(option.value)">
										<span>{{ option.label }}</span>
										<UIcon
											v-if="option.value === props.syncPreferences.retryCount"
											name="i-lucide-check"
											class="h-4 w-4 text-primary" />
									</button>
								</div>
							</template>
						</UPopover>
					</div>
				</div>
			</div>

			<div class="rounded-2xl border border-default/70 bg-elevated/30 px-3 py-3">
				<div class="flex items-start justify-between gap-3">
					<div>
						<div class="text-[11px] font-medium text-default">{{ t('settings.remoteSync.autoSync.title') }}</div>
						<div class="mt-0.5 text-[10px] leading-5 text-muted/80">{{ props.autoSyncMetaText }}</div>
					</div>
					<UBadge
						color="neutral"
						variant="soft"
						class="shrink-0">
						{{ props.autoSyncStatusText }}
					</UBadge>
				</div>
				<div
					v-if="props.autoSyncLastError"
					class="mt-2 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-[11px] leading-5 text-error">
					{{ props.autoSyncLastError }}
				</div>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'
	import { useI18n } from 'vue-i18n'

	import { createPopoverLayerUi } from '@/shared/config/ui-layer'
	import type { RemoteSyncPolicy } from '@/shared/types/shared/remote-sync'

	import { SettingsSectionCard } from '../../../shared'

	const { t } = useI18n({ useScope: 'global' })

	const props = defineProps<{
		hasActiveProfile: boolean
		syncPreferences: RemoteSyncPolicy
		autoSyncIntervalOptions: Array<{ label: string; value: number }>
		autoSyncRetryOptions: Array<{ label: string; value: number }>
		autoSyncStatusText: string
		autoSyncMetaText: string
		autoSyncLastError: string | null
		onUpdateAutoSyncEnabled: (value: boolean) => void
		onUpdateAutoSyncRunOnInterval: (value: boolean) => void
		onUpdateAutoSyncIntervalMinutes: (value: number) => void
		onUpdateAutoSyncRetryCount: (value: number) => void
		onUpdateAutoSyncRunOnAppStart: (value: boolean) => void
	}>()

	const popoverUi = createPopoverLayerUi()
	const showAdvanced = ref(false)
	const intervalPopoverOpen = ref(false)
	const retryPopoverOpen = ref(false)

	const intervalLabel = computed(() => {
		return props.autoSyncIntervalOptions.find((option) => option.value === props.syncPreferences.intervalMinutes)?.label
			?? t('settings.remoteSync.autoSync.intervalOption', { minutes: props.syncPreferences.intervalMinutes })
	})

	const retryLabel = computed(() => {
		return props.autoSyncRetryOptions.find((option) => option.value === props.syncPreferences.retryCount)?.label
			?? t('settings.remoteSync.autoSync.retryOption', { count: props.syncPreferences.retryCount })
	})

	function toggleAdvanced() {
		showAdvanced.value = !showAdvanced.value
	}

	function handleSelectInterval(value: number) {
		props.onUpdateAutoSyncIntervalMinutes(value)
		intervalPopoverOpen.value = false
	}

	function handleSelectRetry(value: number) {
		props.onUpdateAutoSyncRetryCount(value)
		retryPopoverOpen.value = false
	}
</script>
