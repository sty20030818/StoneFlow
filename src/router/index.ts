import { createRouter, createWebHashHistory } from 'vue-router'

// Workspace
import Dashboard from '@/pages/workspace/Dashboard/index.vue'
import AllTasks from '@/pages/workspace/AllTasks/index.vue'
import Space from '@/pages/workspace/Space/index.vue'

// Review
import FinishList from '@/pages/review/FinishList/index.vue'
import Stats from '@/pages/review/Stats/index.vue'
import Logs from '@/pages/review/Logs/index.vue'

// Assets Library
import Snippets from '@/pages/assets/Snippets/index.vue'
import Vault from '@/pages/assets/Vault/index.vue'
import Notes from '@/pages/assets/Notes/index.vue'
import Toolbox from '@/pages/assets/Toolbox/index.vue'

// Settings
import Settings from '@/pages/Settings/index.vue'

export const routes = [
	{ path: '/', redirect: '/dashboard' },

	// Workspace
	{ path: '/dashboard', component: Dashboard, meta: { title: 'Dashboard' } },
	{ path: '/all-tasks', component: AllTasks, meta: { title: 'All Tasks' } },
	{ path: '/space/:spaceId', component: Space, meta: { title: 'Space' } },
	// 兼容旧路由
	{ path: '/work', redirect: '/space/work' },
	{ path: '/personal', redirect: '/space/personal' },
	{ path: '/study', redirect: '/space/study' },

	// Review
	{ path: '/finish-list', component: FinishList, meta: { title: 'Finish List' } },
	{ path: '/stats', component: Stats, meta: { title: 'Stats' } },
	{ path: '/logs', component: Logs, meta: { title: 'Logs' } },

	// Assets Library
	{ path: '/snippets', component: Snippets, meta: { title: 'Snippets' } },
	{ path: '/vault', component: Vault, meta: { title: 'Vault' } },
	{ path: '/notes', component: Notes, meta: { title: 'Notes' } },
	{ path: '/toolbox', component: Toolbox, meta: { title: 'Toolbox' } },

	// Settings
	{ path: '/settings', component: Settings, meta: { title: 'Settings' } },
]

export const router = createRouter({
	history: createWebHashHistory(),
	routes,
})
