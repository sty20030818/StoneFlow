import { i18n } from '@/plugins/i18n'

export function tGlobal(key: string): string {
	return i18n.global.t(key)
}
