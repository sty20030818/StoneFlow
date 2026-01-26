import { createRouter, createWebHashHistory } from 'vue-router'

// ProjectView
import ProjectView from '@/pages/ProjectView/index.vue'

// Review
import FinishList from '@/pages/review/FinishList/index.vue'
import Stats from '@/pages/review/Stats/index.vue'
import Logs from '@/pages/review/Logs/index.vue'

// Assets Library
import Snippets from '@/pages/assets/Snippets/index.vue'
import Vault from '@/pages/assets/Vault/index.vue'
import Notes from '@/pages/assets/Notes/index.vue'
import Diary from '@/pages/assets/Diary/index.vue'
import Toolbox from '@/pages/assets/Toolbox/index.vue'

// Settings
import Settings from '@/pages/Settings/index.vue'

export const routes = [
	{ path: '/', redirect: '/space/work' },

	// ProjectView (统一的项目视图)
	{
		path: '/all-tasks',
		component: ProjectView,
		meta: { title: 'All Tasks', icon: 'i-lucide-list-checks', iconClass: 'text-pink-500', description: '所有任务列表' },
	},
	{
		path: '/space/:spaceId',
		component: ProjectView,
		meta: { title: 'Space', icon: 'i-lucide-folder', iconClass: 'text-gray-500', description: '任务空间' },
	},

	// Review
	{
		path: '/finish-list',
		component: FinishList,
		meta: {
			title: 'Finish List',
			icon: 'i-lucide-check-circle',
			iconClass: 'text-green-500',
			description: '已完成任务',
		},
	},
	{
		path: '/stats',
		component: Stats,
		meta: { title: 'Stats', icon: 'i-lucide-bar-chart-3', iconClass: 'text-blue-500', description: '统计数据' },
	},
	{
		path: '/logs',
		component: Logs,
		meta: { title: 'Logs', icon: 'i-lucide-scroll-text', iconClass: 'text-orange-500', description: '操作日志' },
	},

	// Assets Library
	{
		path: '/snippets',
		component: Snippets,
		meta: { title: 'Snippets', icon: 'i-lucide-code', iconClass: 'text-cyan-500', description: '代码片段' },
	},
	{
		path: '/vault',
		component: Vault,
		meta: { title: 'Vault', icon: 'i-lucide-lock', iconClass: 'text-yellow-500', description: '安全存储' },
	},
	{
		path: '/notes',
		component: Notes,
		meta: { title: 'Notes', icon: 'i-lucide-notebook', iconClass: 'text-pink-500', description: '笔记本' },
	},
	{
		path: '/diary',
		component: Diary,
		meta: { title: 'Diary', icon: 'i-lucide-book-open-text', iconClass: 'text-indigo-500', description: '工作日志' },
	},
	{
		path: '/toolbox',
		component: Toolbox,
		meta: { title: 'Toolbox', icon: 'i-lucide-wrench', iconClass: 'text-gray-500', description: '实用工具' },
	},

	// Settings
	{
		path: '/settings',
		component: Settings,
		meta: { title: '设置', icon: 'i-lucide-settings', iconClass: 'text-gray-500', description: '应用偏好设置' },
	},
]

export const router = createRouter({
	history: createWebHashHistory(),
	routes,
})
