import { formatDistanceToNow } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'

import { i18n } from '@/i18n'
import { DEFAULT_LOCALE, normalizeAppLocale, type AppLocale } from '@/i18n/messages'

const DATE_FNS_LOCALE_MAP = {
	'zh-CN': zhCN,
	'en-US': enUS,
} as const

type TimeValue = number | string | Date | null | undefined

type BaseTimeFormatOptions = {
	locale?: string | null
	fallback?: string
}

type RelativeTimeFormatOptions = BaseTimeFormatOptions & {
	addSuffix?: boolean
}

type AbsoluteTimeFormatOptions = BaseTimeFormatOptions & Intl.DateTimeFormatOptions

function toValidDate(value: TimeValue): Date | null {
	if (value === null || value === undefined) return null
	const date = value instanceof Date ? value : new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

export function resolveTimeLocale(locale?: string | null): AppLocale {
	const fromParam = normalizeAppLocale(locale)
	if (fromParam) return fromParam
	const fromI18n = normalizeAppLocale(String(i18n.global.locale.value))
	return fromI18n ?? DEFAULT_LOCALE
}

function resolveFallback(fallback?: string): string {
	if (typeof fallback === 'string' && fallback.trim().length > 0) return fallback
	return '-'
}

function formatByIntl(value: TimeValue, options: AbsoluteTimeFormatOptions): string {
	const date = toValidDate(value)
	if (!date) return resolveFallback(options.fallback)
	const locale = resolveTimeLocale(options.locale)
	const { fallback: _fallback, locale: _locale, ...formatOptions } = options
	return new Intl.DateTimeFormat(locale, formatOptions).format(date)
}

/**
 * 判断时间戳是否为今天（本地时间）
 */
export function isTodayLocal(ts: number | null): boolean {
	const date = toValidDate(ts)
	if (!date) return false
	const now = new Date()
	return (
		date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
	)
}

/**
 * 统一日期格式化（遵循当前 locale）。
 */
export function formatDate(value: TimeValue, options: AbsoluteTimeFormatOptions = {}): string {
	return formatByIntl(value, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		...options,
	})
}

/**
 * 统一时间格式化（遵循当前 locale）。
 */
export function formatTimeOfDay(value: TimeValue, options: AbsoluteTimeFormatOptions = {}): string {
	return formatByIntl(value, {
		hour: '2-digit',
		minute: '2-digit',
		...options,
	})
}

/**
 * 统一日期时间格式化（遵循当前 locale）。
 */
export function formatDateTime(value: TimeValue, options: AbsoluteTimeFormatOptions = {}): string {
	return formatByIntl(value, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		...options,
	})
}

/**
 * 统一相对时间格式化（遵循当前 locale）。
 */
export function formatRelativeDistance(value: TimeValue, options: RelativeTimeFormatOptions = {}): string {
	const date = toValidDate(value)
	if (!date) return resolveFallback(options.fallback)
	const locale = resolveTimeLocale(options.locale)
	try {
		return formatDistanceToNow(date, {
			addSuffix: options.addSuffix ?? true,
			locale: DATE_FNS_LOCALE_MAP[locale],
		})
	} catch {
		return resolveFallback(options.fallback)
	}
}

/**
 * 兼容旧组件：按“今天/昨天/近 7 天/日期”展示时间。
 */
export function formatTime(timestamp: number): string {
	const date = toValidDate(timestamp)
	if (!date) return '-'
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
	const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return i18n.global.t('taskCard.time.today')
	if (diffDays === 1) return i18n.global.t('taskCard.time.yesterday')
	if (diffDays > 1 && diffDays <= 7) return i18n.global.t('taskCard.time.daysAgo', { count: diffDays })

	return formatDate(date, {
		month: 'numeric',
		day: 'numeric',
	})
}
