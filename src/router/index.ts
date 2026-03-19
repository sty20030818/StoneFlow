import { createRouter, createWebHashHistory } from 'vue-router'
import { PAGE_NAV_CONFIG, toRouteMeta } from '@/config/page-nav'
import { HEADER_CAPSULE_TONE_SLATE } from '@/config/ui/capsule'

const ProjectView = () => import('@/pages/ProjectViewPage.vue')

const FinishList = () => import('@/pages/ReviewFinishListPage.vue')
const Stats = () => import('@/pages/ReviewStatsPage.vue')
const Logs = () => import('@/pages/ReviewLogsPage.vue')

const Snippets = () => import('@/pages/AssetsSnippetsPage.vue')
const Vault = () => import('@/pages/AssetsVaultPage.vue')
const Notes = () => import('@/pages/AssetsNotesPage.vue')
const Diary = () => import('@/pages/AssetsDiaryPage.vue')
const Trash = () => import('@/pages/TrashPage.vue')

const Settings = () => import('@/pages/SettingsPage.vue')
const SettingsAppearance = () => import('@/pages/SettingsAppearancePage.vue')
const SettingsAbout = () => import('@/pages/SettingsAboutPage.vue')
const SettingsRemoteSync = () => import('@/pages/SettingsRemoteSyncPage.vue')
const StartupGate = () => import('@/startup/StartupGate.vue')

export const routes = [
	{
		path: '/',
		component: StartupGate,
		meta: {
			titleKey: 'routes.startupGate.title',
			descriptionKey: 'routes.startupGate.description',
		},
	},

	// ProjectView (统一的项目视图)
	{
		path: PAGE_NAV_CONFIG.allTasks.path,
		component: ProjectView,
		meta: toRouteMeta(PAGE_NAV_CONFIG.allTasks),
	},
	{
		path: '/space/:spaceId',
		component: ProjectView,
		meta: {
			titleKey: 'routes.space.title',
			icon: 'i-lucide-folder',
			iconClass: 'text-gray-500',
			pillClass: HEADER_CAPSULE_TONE_SLATE,
			descriptionKey: 'routes.space.description',
		},
	},

	// Review
	{
		path: PAGE_NAV_CONFIG.finishList.path,
		component: FinishList,
		meta: toRouteMeta(PAGE_NAV_CONFIG.finishList),
	},
	{
		path: PAGE_NAV_CONFIG.stats.path,
		component: Stats,
		meta: toRouteMeta(PAGE_NAV_CONFIG.stats),
	},
	{
		path: PAGE_NAV_CONFIG.logs.path,
		component: Logs,
		meta: toRouteMeta(PAGE_NAV_CONFIG.logs),
	},

	// Assets Library
	{
		path: PAGE_NAV_CONFIG.snippets.path,
		component: Snippets,
		meta: toRouteMeta(PAGE_NAV_CONFIG.snippets),
	},
	{
		path: PAGE_NAV_CONFIG.vault.path,
		component: Vault,
		meta: toRouteMeta(PAGE_NAV_CONFIG.vault),
	},
	{
		path: PAGE_NAV_CONFIG.notes.path,
		component: Notes,
		meta: toRouteMeta(PAGE_NAV_CONFIG.notes),
	},
	{
		path: PAGE_NAV_CONFIG.diary.path,
		component: Diary,
		meta: toRouteMeta(PAGE_NAV_CONFIG.diary),
	},
	{
		path: PAGE_NAV_CONFIG.trash.path,
		component: Trash,
		meta: toRouteMeta(PAGE_NAV_CONFIG.trash),
	},

	// Settings
	{
		path: '/settings',
		component: Settings,
		meta: {
			titleKey: 'routes.settings.title',
			icon: 'i-lucide-settings',
			iconClass: 'text-gray-500',
			pillClass: HEADER_CAPSULE_TONE_SLATE,
			descriptionKey: 'routes.settings.description',
			leadingMode: 'root',
		},
		children: [
			{
				path: '',
				redirect: '/settings/appearance',
			},
			{
				path: 'appearance',
				component: SettingsAppearance,
				meta: {
					titleKey: 'routes.settingsAppearance.title',
					icon: 'i-lucide-palette',
					iconClass: 'text-violet-500',
					pillClass: 'bg-violet-500',
					descriptionKey: 'routes.settingsAppearance.description',
				},
			},
			{
				path: 'about',
				component: SettingsAbout,
				meta: {
					titleKey: 'routes.settingsAbout.title',
					icon: 'i-lucide-info',
					iconClass: 'text-blue-500',
					pillClass: 'bg-blue-500',
					descriptionKey: 'routes.settingsAbout.description',
				},
			},
			{
				path: 'remote-sync',
				component: SettingsRemoteSync,
				meta: {
					titleKey: 'routes.settingsRemoteSync.title',
					icon: 'i-lucide-cloud',
					iconClass: 'text-cyan-500',
					pillClass: 'bg-cyan-500',
					descriptionKey: 'routes.settingsRemoteSync.description',
				},
			},
		],
	},
]

export const router = createRouter({
	history: createWebHashHistory(),
	routes,
})
