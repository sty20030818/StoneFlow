import { createRouter, createWebHashHistory } from 'vue-router'

const ProjectView = () => import('@/pages/ProjectView/index.vue')

const FinishList = () => import('@/pages/review/FinishList/index.vue')
const Stats = () => import('@/pages/review/Stats/index.vue')
const Logs = () => import('@/pages/review/Logs/index.vue')

const Snippets = () => import('@/pages/assets/Snippets/index.vue')
const Vault = () => import('@/pages/assets/Vault/index.vue')
const Notes = () => import('@/pages/assets/Notes/index.vue')
const Diary = () => import('@/pages/assets/Diary/index.vue')
const Toolbox = () => import('@/pages/assets/Toolbox/index.vue')
const Trash = () => import('@/pages/Trash/index.vue')

const Settings = () => import('@/pages/Settings/index.vue')
const SettingsAbout = () => import('@/pages/Settings/About/index.vue')
const SettingsRemoteSync = () => import('@/pages/Settings/RemoteSync/index.vue')
const StartupGate = () => import('@/startup/StartupGate.vue')

export const routes = [
	{
		path: '/',
		component: StartupGate,
		meta: { title: 'Startup Gate', description: '启动路由占位，由启动流程决定最终目标页面' },
	},

	// ProjectView (统一的项目视图)
	{
		path: '/all-tasks',
		component: ProjectView,
		meta: { title: '所有任务', icon: 'i-lucide-list-checks', iconClass: 'text-pink-500', description: '所有任务列表' },
	},
	{
		path: '/space/:spaceId',
		component: ProjectView,
		meta: { title: '空间', icon: 'i-lucide-folder', iconClass: 'text-gray-500', description: '任务空间' },
	},

	// Review
	{
		path: '/finish-list',
		component: FinishList,
		meta: {
			title: '完成列表',
			icon: 'i-lucide-check-circle',
			iconClass: 'text-green-500',
			description: '已完成任务',
		},
	},
	{
		path: '/stats',
		component: Stats,
		meta: { title: '统计', icon: 'i-lucide-bar-chart-3', iconClass: 'text-blue-500', description: '统计数据' },
	},
	{
		path: '/logs',
		component: Logs,
		meta: { title: '日志', icon: 'i-lucide-scroll-text', iconClass: 'text-orange-500', description: '操作日志' },
	},

	// Assets Library
	{
		path: '/snippets',
		component: Snippets,
		meta: { title: '代码片段', icon: 'i-lucide-code', iconClass: 'text-cyan-500', description: '代码片段' },
	},
	{
		path: '/vault',
		component: Vault,
		meta: { title: '密钥库', icon: 'i-lucide-lock', iconClass: 'text-yellow-500', description: '安全存储' },
	},
	{
		path: '/notes',
		component: Notes,
		meta: { title: '笔记', icon: 'i-lucide-notebook', iconClass: 'text-pink-500', description: '笔记本' },
	},
	{
		path: '/diary',
		component: Diary,
		meta: { title: '日记', icon: 'i-lucide-book-open-text', iconClass: 'text-indigo-500', description: '工作日志' },
	},
	{
		path: '/toolbox',
		component: Toolbox,
		meta: { title: '工具箱', icon: 'i-lucide-wrench', iconClass: 'text-gray-500', description: '实用工具' },
	},
	{
		path: '/trash',
		component: Trash,
		meta: { title: '回收站', icon: 'i-lucide-trash-2', iconClass: 'text-red-500', description: '回收站' },
	},

	// Settings
	{
		path: '/settings',
		component: Settings,
		meta: { title: '设置', icon: 'i-lucide-settings', iconClass: 'text-gray-500', description: '应用偏好设置' },
		children: [
			{
				path: '',
				redirect: '/settings/about',
			},
			{
				path: 'about',
				component: SettingsAbout,
				meta: {
					title: '关于',
					icon: 'i-lucide-info',
					iconClass: 'text-blue-500',
					description: '版本、更新与应用信息',
				},
			},
			{
				path: 'remote-sync',
				component: SettingsRemoteSync,
				meta: {
					title: '远端同步',
					icon: 'i-lucide-cloud',
					iconClass: 'text-cyan-500',
					description: '同步配置与上传下载',
				},
			},
		],
	},
]

export const router = createRouter({
	history: createWebHashHistory(),
	routes,
})
