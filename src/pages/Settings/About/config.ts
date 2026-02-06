export const RELEASE_PAGE_URL = 'https://release.sty20030818.space/stoneflow/'
export const CHANGELOG_URL = 'https://release.sty20030818.space/stoneflow/'
export const PRIVACY_URL = 'https://github.com/sty20030818/StoneFlow'
export const LICENSE_URL = 'https://github.com/sty20030818/StoneFlow/blob/main/LICENSE'

export const ABOUT_LINKS = [
	{
		id: 'github',
		label: 'GitHub',
		value: 'https://github.com/sty20030818/StoneFlow',
	},
	{
		id: 'release',
		label: '下载页',
		value: RELEASE_PAGE_URL,
	},
	{
		id: 'issues',
		label: '提交 Issue',
		value: 'https://github.com/sty20030818/StoneFlow/issues',
	},
]

export const CHANGELOG_SUMMARY = [
	{
		version: '0.1.2',
		date: '2026-02-06',
		items: ['远端同步配置改为本地持久化', '同步配置支持导入与切换'],
	},
	{
		version: '0.1.1',
		date: '2026-02-01',
		items: ['任务与项目交互细节优化', '稳定性修复'],
	},
	{
		version: '0.1.0',
		date: '2026-01-28',
		items: ['首个可用版本发布', '基础项目与任务管理能力上线'],
	},
]
