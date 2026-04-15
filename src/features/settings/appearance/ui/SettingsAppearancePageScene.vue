<template>
	<section class="grid gap-5 xl:grid-cols-2">
		<div
			v-motion="sectionMotions[0]"
			class="flex min-w-0 w-full">
			<SettingsSectionCard
				card-class="flex h-full w-full flex-col overflow-hidden"
				body-class="flex-1">
				<template #header>
					<div class="space-y-1.5">
						<div class="text-[16px] font-semibold tracking-[0.01em] text-default">
							{{ t('settings.appearance.theme.title') }}
						</div>
						<div class="max-w-xl text-[12px] leading-5 text-muted">
							{{ t('settings.appearance.theme.description') }}
						</div>
					</div>
				</template>

				<div class="-mx-4 -mb-4 flex h-full flex-col px-4 pb-4 pt-3 sm:-mx-5 sm:-mb-5 sm:px-5">
					<div class="space-y-2.5">
						<button
							v-for="option in themeOptions"
							:key="option.value"
							type="button"
							class="group relative w-full overflow-hidden rounded-[18px] border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px"
							:class="option.value === preference ? activeOptionCardClass : inactiveOptionCardClass"
							@click="void setPreference(option.value)">
							<div
								class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
								:class="[
									option.overlayClass,
									option.value === preference ? 'opacity-100' : 'group-hover:opacity-55',
								]"></div>

							<div class="relative flex items-center justify-between gap-4">
								<div class="flex min-w-0 items-center gap-3.5">
									<div
										class="flex size-10 shrink-0 items-center justify-center rounded-[14px] border transition-colors duration-200"
										:class="
											option.value === preference ? option.activeVisualShellClass : option.inactiveVisualShellClass
										">
										<UIcon
											:name="option.icon"
											class="size-5"
											:class="option.value === preference ? option.activeVisualClass : option.inactiveVisualClass" />
									</div>
									<div class="min-w-0 space-y-1">
										<div class="text-[14px] font-semibold tracking-[0.01em] text-default">
											{{ option.label }}
										</div>
										<div class="text-[12px] leading-5 text-muted">
											{{ option.description }}
										</div>
									</div>
								</div>

								<div
									class="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
									:class="option.value === preference ? activeIndicatorShellClass : inactiveIndicatorShellClass">
									<UIcon
										name="i-lucide-check"
										class="size-3.5"
										:class="option.value === preference ? activeIndicatorClass : 'opacity-0'" />
								</div>
							</div>
						</button>
					</div>
				</div>
			</SettingsSectionCard>
		</div>

		<div
			v-motion="sectionMotions[1]"
			class="flex min-w-0 w-full">
			<SettingsSectionCard
				card-class="flex h-full w-full flex-col overflow-hidden"
				body-class="flex-1">
				<template #header>
					<div class="space-y-1.5">
						<div class="text-[16px] font-semibold tracking-[0.01em] text-default">
							{{ t('settings.appearance.locale.title') }}
						</div>
						<div class="max-w-xl text-[12px] leading-5 text-muted">
							{{ t('settings.appearance.locale.description') }}
						</div>
					</div>
				</template>

				<div class="-mx-4 -mb-4 flex h-full flex-col px-4 pb-4 pt-3 sm:-mx-5 sm:-mb-5 sm:px-5">
					<div class="space-y-2.5">
						<button
							v-for="option in localeOptions"
							:key="option.value"
							type="button"
							class="group relative w-full overflow-hidden rounded-[18px] border px-4 py-3 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out hover:-translate-y-px"
							:class="option.value === selectedLocale ? activeOptionCardClass : inactiveOptionCardClass"
							@click="selectedLocale = option.value">
							<div
								class="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
								:class="[
									option.overlayClass,
									option.value === selectedLocale ? 'opacity-100' : 'group-hover:opacity-55',
								]"></div>

							<div class="relative flex items-center justify-between gap-4">
								<div class="flex min-w-0 items-center gap-3.5">
									<div
										class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border transition-colors duration-200"
										:class="
											option.value === selectedLocale ? option.activeVisualShellClass : option.inactiveVisualShellClass
										">
										<LocaleFlag
											:locale="option.value"
											class="size-6" />
									</div>
									<div class="min-w-0 space-y-1">
										<div class="text-[14px] font-semibold tracking-[0.01em] text-default">
											{{ option.label }}
										</div>
										<div class="text-[12px] leading-5 text-muted">
											{{ option.description }}
										</div>
									</div>
								</div>

								<div
									class="flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200"
									:class="option.value === selectedLocale ? activeIndicatorShellClass : inactiveIndicatorShellClass">
									<UIcon
										name="i-lucide-check"
										class="size-3.5"
										:class="option.value === selectedLocale ? activeIndicatorClass : 'opacity-0'" />
								</div>
							</div>
						</button>
					</div>

					<div class="mt-auto pt-2.5">
						<div
							class="rounded-[18px] border border-default/70 bg-elevated/45 px-4 py-3 text-[12px] leading-5 text-muted">
							{{ t('locale.trayRestartNotice') }}
						</div>
					</div>
				</div>
			</SettingsSectionCard>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useI18n } from 'vue-i18n'

	import LocaleFlag from '@/shared/ui/shared/LocaleFlag.vue'
	import { useAppTheme } from '@/app/logic/useAppTheme'
	import {
		createStaggeredEnterMotions,
		getAppStaggerDelay,
		useContentMotionPreset,
	} from '@/shared/composables/base/motion'
	import { THEME_PREFERENCE_ICONS } from '@/shared/config/theme'
	import { SettingsSectionCard, useSettingsLocaleControl } from '@/features/settings'
	import type { AppLocale } from '@/i18n/messages'
	import type { ThemePreference } from '@/shared/types/shared/settings'

	const { t } = useI18n({ useScope: 'global' })
	const { preference, setPreference } = useAppTheme()
	const { selectedLocale } = useSettingsLocaleControl()
	const sectionPreset = useContentMotionPreset('drawerSection')
	const sectionMotions = computed(() => createStaggeredEnterMotions(2, sectionPreset.value, getAppStaggerDelay))

	const activeOptionCardClass =
		'border-primary/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] shadow-[0_18px_40px_-32px_rgba(37,99,235,0.22)] dark:border-primary/35 dark:bg-[linear-gradient(135deg,rgba(30,41,59,0.92),rgba(15,23,42,0.9))] dark:shadow-[0_18px_40px_-28px_rgba(2,6,23,0.62)]'
	const inactiveOptionCardClass =
		'border-default/70 bg-default/80 hover:border-default hover:bg-elevated/65 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.24)] dark:hover:shadow-[0_14px_30px_-24px_rgba(0,0,0,0.46)]'
	const activeIndicatorShellClass = 'border-primary/45 bg-primary/10 dark:bg-primary/14'
	const inactiveIndicatorShellClass = 'border-default/70 bg-default/60'
	const activeIndicatorClass = 'text-primary'

	const themeOptions = computed(() => [
		createThemeOption('light', {
			overlayClass: 'from-amber-400/12 via-transparent to-transparent',
			activeVisualShellClass: 'border-amber-200/80 bg-white/90 dark:border-amber-300/20 dark:bg-slate-950/35',
			activeVisualClass: 'text-amber-500 dark:text-amber-300',
		}),
		createThemeOption('dark', {
			overlayClass: 'from-emerald-400/14 via-cyan-400/6 to-transparent',
			activeVisualShellClass: 'border-slate-800/80 bg-slate-950 text-white dark:border-white/10 dark:bg-slate-950/55',
			activeVisualClass: 'text-slate-50',
		}),
		createThemeOption('system', {
			overlayClass: 'from-sky-400/12 via-transparent to-transparent',
			activeVisualShellClass: 'border-sky-200/80 bg-white/90 dark:border-sky-300/20 dark:bg-slate-950/35',
			activeVisualClass: 'text-sky-600 dark:text-sky-300',
		}),
	])

	const localeOptions = computed(() => [
		createLocaleOption(
			'zh-CN',
			t('locale.options.zh-CN'),
			t('settings.appearance.locale.optionDescription.zh-CN'),
			'from-red-400/12 via-transparent to-transparent',
		),
		createLocaleOption(
			'en-US',
			t('locale.options.en-US'),
			t('settings.appearance.locale.optionDescription.en-US'),
			'from-blue-400/12 via-transparent to-transparent',
		),
	])

	function createThemeOption(
		value: ThemePreference,
		config: {
			overlayClass: string
			activeVisualShellClass: string
			activeVisualClass: string
		},
	) {
		return {
			value,
			label: t(`theme.modes.${value}`),
			description: t(`settings.appearance.theme.optionDescription.${value}`),
			icon: THEME_PREFERENCE_ICONS[value],
			overlayClass: `bg-gradient-to-br ${config.overlayClass}`,
			activeVisualShellClass: config.activeVisualShellClass,
			inactiveVisualShellClass: 'border-default/70 bg-default/75 group-hover:bg-default',
			activeVisualClass: config.activeVisualClass,
			inactiveVisualClass: 'text-default',
		}
	}

	function createLocaleOption(value: AppLocale, label: string, description: string, overlayClass: string) {
		return {
			value,
			label,
			description,
			overlayClass: `bg-gradient-to-br ${overlayClass}`,
			activeVisualShellClass: 'border-primary/15 bg-white/88 dark:border-white/10 dark:bg-slate-950/42',
			inactiveVisualShellClass: 'border-default/70 bg-default/75 group-hover:bg-default',
		}
	}
</script>
