import { createRouter, createWebHashHistory } from 'vue-router'
import { PAGE_NAV_CONFIG, toRouteMeta } from '@/config/page-nav'

const ProjectView = () => import('@/pages/ProjectView/index.vue')

const FinishList = () => import('@/pages/review/FinishList/index.vue')
const Stats = () => import('@/pages/review/Stats/index.vue')
const Logs = () => import('@/pages/review/Logs/index.vue')

const Snippets = () => import('@/pages/assets/Snippets/index.vue')
const Vault = () => import('@/pages/assets/Vault/index.vue')
const Notes = () => import('@/pages/assets/Notes/index.vue')
const Diary = () => import('@/pages/assets/Diary/index.vue')
const Trash = () => import('@/pages/Trash/index.vue')

const Settings = () => import('@/pages/Settings/index.vue')
const SettingsAbout = () => import('@/pages/Settings/About/index.vue')
const SettingsRemoteSync = () => import('@/pages/Settings/RemoteSync/index.vue')
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
			pillClass: 'bg-gray-500',
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
			pillClass: 'bg-gray-500',
			descriptionKey: 'routes.settings.description',
		},
		children: [
			{
				path: '',
				redirect: '/settings/about',
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
