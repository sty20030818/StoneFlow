export const RELEASE_PAGE_URL = 'https://release.sty20030818.space/stoneflow/'
export const CHANGELOG_URL = 'https://github.com/sty20030818/StoneFlow/blob/main/changelog.md'
export const PRIVACY_URL = 'https://github.com/sty20030818/StoneFlow'
export const LICENSE_URL = 'https://github.com/sty20030818/StoneFlow/blob/main/LICENSE'

export const ABOUT_LINKS = [
	{
		id: 'github',
		labelKey: 'settings.about.links.items.github',
		value: 'https://github.com/sty20030818/StoneFlow',
	},
	{
		id: 'release',
		labelKey: 'settings.about.links.items.release',
		value: RELEASE_PAGE_URL,
	},
	{
		id: 'issues',
		labelKey: 'settings.about.links.items.issues',
		value: 'https://github.com/sty20030818/StoneFlow/issues',
	},
] as const
