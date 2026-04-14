import type { ThemePreference } from '@/shared/types/shared/settings'

export const THEME_PREFERENCE_VALUES = ['light', 'dark', 'system'] as const satisfies readonly ThemePreference[]
export const THEME_PREFERENCE_ORDER: readonly ThemePreference[] = ['light', 'dark', 'system']
export const COLOR_MODE_STORAGE_KEY = 'vueuse-color-scheme'

export const THEME_PREFERENCE_ICONS: Record<ThemePreference, string> = {
	light: 'i-lucide-sun-medium',
	dark: 'i-lucide-moon-star',
	system: 'i-lucide-monitor',
}

export type ResolvedTheme = 'light' | 'dark'

export function normalizeThemePreference(value: string | null | undefined): ThemePreference {
	if (typeof value === 'string' && (THEME_PREFERENCE_VALUES as readonly string[]).includes(value)) {
		return value as ThemePreference
	}
	return 'system'
}

export function resolveSystemTheme(): ResolvedTheme {
	if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return 'dark'
	}
	return 'light'
}

export function resolveThemePreference(preference: ThemePreference): ResolvedTheme {
	return preference === 'system' ? resolveSystemTheme() : preference
}

export function nextThemePreference(current: ThemePreference): ThemePreference {
	const currentIndex = THEME_PREFERENCE_ORDER.indexOf(current)
	const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_PREFERENCE_ORDER.length : 0
	return THEME_PREFERENCE_ORDER[nextIndex]
}

export function applyThemeToDocument(preference: ThemePreference) {
	if (typeof document === 'undefined') return

	const resolvedTheme = resolveThemePreference(preference)
	const root = document.documentElement

	root.classList.toggle('dark', resolvedTheme === 'dark')
	root.style.colorScheme = resolvedTheme
	root.dataset.themePreference = preference
	root.dataset.themeResolved = resolvedTheme

	if (typeof window !== 'undefined') {
		try {
			window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, preference === 'system' ? 'auto' : preference)
		} catch {
			// 忽略只读环境或隐私模式下的 localStorage 写入失败。
		}
	}
}
