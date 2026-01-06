import { createRouter, createWebHashHistory } from 'vue-router'

// Workspace
import Dashboard from '@/pages/workspace/Dashboard.vue'
import AllTasks from '@/pages/workspace/AllTasks.vue'
import Work from '@/pages/workspace/Work.vue'
import Personal from '@/pages/workspace/Personal.vue'
import Study from '@/pages/workspace/Study.vue'

// Review
import FinishList from '@/pages/review/FinishList.vue'
import Stats from '@/pages/review/Stats.vue'
import Logs from '@/pages/review/Logs.vue'

// Assets Library
import Snippets from '@/pages/assets/Snippets.vue'
import Vault from '@/pages/assets/Vault.vue'
import Notes from '@/pages/assets/Notes.vue'
import Toolbox from '@/pages/assets/Toolbox.vue'

// Settings
import Settings from '@/pages/Settings.vue'

export const routes = [
	{ path: '/', redirect: '/dashboard' },

	// Workspace
	{ path: '/dashboard', component: Dashboard, meta: { title: 'Dashboard' } },
	{ path: '/all-tasks', component: AllTasks, meta: { title: 'All Tasks' } },
	{ path: '/work', component: Work, meta: { title: 'Work' } },
	{ path: '/personal', component: Personal, meta: { title: 'Personal' } },
	{ path: '/study', component: Study, meta: { title: 'Study' } },

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
