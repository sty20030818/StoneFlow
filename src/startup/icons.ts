import { addCollection, loadIcons } from '@iconify/vue'

let iconsBootstrapPromise: Promise<void> | null = null
let iconsBootstrapped = false
let localCollectionPromise: Promise<boolean> | null = null
let hasLocalCollection = false

const LUCIDE_ICONS_TO_PRELOAD = [
	'lucide:activity',
	'lucide:alarm-clock',
	'lucide:alert-triangle',
	'lucide:arrow-right',
	'lucide:arrow-up-down',
	'lucide:bar-chart-3',
	'lucide:book-open',
	'lucide:book-open-text',
	'lucide:briefcase',
	'lucide:calendar-range',
	'lucide:check',
	'lucide:check-circle',
	'lucide:check-circle-2',
	'lucide:chevron-down',
	'lucide:chevron-right',
	'lucide:chevron-up',
	'lucide:circle-dot',
	'lucide:clock',
	'lucide:cloud',
	'lucide:cloud-download',
	'lucide:cloud-upload',
	'lucide:code',
	'lucide:coffee',
	'lucide:construction',
	'lucide:copy',
	'lucide:download',
	'lucide:edit',
	'lucide:external-link',
	'lucide:eye',
	'lucide:eye-off',
	'lucide:file-text',
	'lucide:filter',
	'lucide:flag',
	'lucide:flame',
	'lucide:folder',
	'lucide:folder-check',
	'lucide:folder-open',
	'lucide:hash',
	'lucide:inbox',
	'lucide:info',
	'lucide:layout-dashboard',
	'lucide:leaf',
	'lucide:line-chart',
	'lucide:link-2',
	'lucide:list-checks',
	'lucide:list-todo',
	'lucide:list-tree',
	'lucide:loader-circle',
	'lucide:lock',
	'lucide:message-circle',
	'lucide:minus',
	'lucide:more-horizontal',
	'lucide:notebook',
	'lucide:pen',
	'lucide:pencil',
	'lucide:pie-chart',
	'lucide:plus',
	'lucide:refresh-cw',
	'lucide:rotate-cw',
	'lucide:save',
	'lucide:scroll-text',
	'lucide:search',
	'lucide:settings',
	'lucide:shield',
	'lucide:sparkles',
	'lucide:stethoscope',
	'lucide:sun',
	'lucide:trash-2',
	'lucide:upload',
	'lucide:user',
	'lucide:wrench',
	'lucide:x',
	'lucide:x-circle',
] as const

async function registerLocalLucideCollection(): Promise<boolean> {
	if (localCollectionPromise) return localCollectionPromise

	localCollectionPromise = (async () => {
		try {
			// 用户安装 @iconify-json/lucide 后，这里会走本地全集合，不再请求远程。
			const mod = await import('@iconify-json/lucide/icons.json')
			const collection = mod?.default ?? mod
			addCollection(collection)
			hasLocalCollection = true
			return true
		} catch {
			hasLocalCollection = false
			return false
		}
	})()

	return localCollectionPromise
}

async function preloadRemoteIcons(timeoutMs = 1200): Promise<void> {
	await new Promise<void>((resolve) => {
		let settled = false
		const finish = () => {
			if (settled) return
			settled = true
			resolve()
		}

		const timer = window.setTimeout(finish, timeoutMs)
		loadIcons([...LUCIDE_ICONS_TO_PRELOAD], () => {
			window.clearTimeout(timer)
			finish()
		})
	})
}

/**
 * mode: 'critical' 仅确保本地图标集合可用于首屏
 * mode: 'full' 在 critical 基础上执行远程兜底预热
 */
export async function initializeIcons(mode: 'critical' | 'full' = 'full'): Promise<void> {
	await registerLocalLucideCollection()
	if (mode === 'critical') return
	if (iconsBootstrapped) return
	if (iconsBootstrapPromise) return iconsBootstrapPromise

	iconsBootstrapPromise = (async () => {
		if (!hasLocalCollection) {
			await preloadRemoteIcons()
		}
	})().finally(() => {
		iconsBootstrapped = true
		iconsBootstrapPromise = null
	})

	return iconsBootstrapPromise
}
