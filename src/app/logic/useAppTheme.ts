import { createGlobalState, useColorMode as useVueUseColorMode } from '@vueuse/core'
import { computed, watch } from 'vue'

import {
	THEME_PREFERENCE_ICONS,
	THEME_PREFERENCE_ORDER,
	applyThemeToDocument,
	nextThemePreference,
	normalizeThemePreference,
	type ResolvedTheme,
} from '@/shared/config/theme'
import { DEFAULT_SETTINGS, settingsStore } from '@/infra/tauri/store'
import { useSettingsStore } from '@/app/stores/settings'
import type { SettingsModel, ThemePreference } from '@/shared/types/shared/settings'

export async function preloadAppThemePreference() {
	try {
		const stored = await settingsStore.get<SettingsModel>('settings')
		const preference = normalizeThemePreference(stored?.themePreference ?? DEFAULT_SETTINGS.themePreference)
		applyThemeToDocument(preference)
		return preference
	} catch (error) {
		applyThemeToDocument(DEFAULT_SETTINGS.themePreference)
		throw error
	}
}

const useAppThemeState = createGlobalState(() => {
	const settings = useSettingsStore()
	const { store, system } = useVueUseColorMode()

	const colorMode = {
		get preference(): ThemePreference {
			return store.value === 'auto' ? 'system' : normalizeThemePreference(store.value)
		},
		set preference(value: ThemePreference) {
			store.value = value === 'system' ? 'auto' : value
		},
		get value(): ResolvedTheme {
			return store.value === 'auto' ? (system.value as ResolvedTheme) : (store.value as ResolvedTheme)
		},
		forced: false,
	}

	const preference = computed<ThemePreference>(() => normalizeThemePreference(settings.settings.themePreference))
	const resolved = computed<ResolvedTheme>(() => (colorMode.value === 'dark' ? 'dark' : 'light'))

	async function setPreference(next: ThemePreference) {
		const normalized = normalizeThemePreference(next)

		applyThemeToDocument(normalized)
		if (!colorMode.forced && colorMode.preference !== normalized) {
			colorMode.preference = normalized
		}
		if (settings.settings.themePreference !== normalized) {
			await settings.update({ themePreference: normalized })
		}
	}

	async function cyclePreference() {
		const next = nextThemePreference(preference.value)
		await setPreference(next)
		return next
	}

	watch(
		() => (settings.loaded ? normalizeThemePreference(settings.settings.themePreference) : null),
		(nextPreference) => {
			if (!nextPreference) return
			applyThemeToDocument(nextPreference)
			if (!colorMode.forced && colorMode.preference !== nextPreference) {
				colorMode.preference = nextPreference
			}
		},
		{ immediate: true },
	)

	watch(
		() => [preference.value, resolved.value] as const,
		([nextPreference]) => {
			applyThemeToDocument(nextPreference)
		},
		{ immediate: true },
	)

	return {
		preference,
		resolved,
		setPreference,
		cyclePreference,
	}
})

export function useAppTheme() {
	const state = useAppThemeState()

	const nextPreference = computed(() => nextThemePreference(state.preference.value))
	const currentIcon = computed(() => THEME_PREFERENCE_ICONS[state.preference.value])
	const nextIcon = computed(() => THEME_PREFERENCE_ICONS[nextPreference.value])

	return {
		preference: state.preference,
		resolved: state.resolved,
		themePreferenceOrder: THEME_PREFERENCE_ORDER,
		currentIcon,
		nextPreference,
		nextIcon,
		setPreference: state.setPreference,
		cyclePreference: state.cyclePreference,
	}
}
