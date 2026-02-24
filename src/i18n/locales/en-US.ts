export default {
	app: {
		name: 'StoneFlow',
	},
	locale: {
		label: 'Language',
		description: 'Set the app display language',
		options: {
			'zh-CN': 'Simplified Chinese',
			'en-US': 'English (US)',
		},
	},
	common: {
		actions: {
			confirm: 'Confirm',
			cancel: 'Cancel',
			save: 'Save',
			close: 'Close',
		},
		status: {
			loading: 'Loading',
			error: 'Something went wrong',
		},
	},
	fallback: {
		unknownError: 'Unknown error',
	},
} as const
