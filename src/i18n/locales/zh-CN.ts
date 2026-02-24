export default {
	app: {
		name: 'StoneFlow',
	},
	locale: {
		label: '语言',
		description: '设置应用显示语言',
		options: {
			'zh-CN': '简体中文',
			'en-US': 'English (US)',
		},
	},
	common: {
		actions: {
			confirm: '确认',
			cancel: '取消',
			save: '保存',
			close: '关闭',
		},
		status: {
			loading: '加载中',
			error: '发生错误',
		},
	},
	fallback: {
		unknownError: '未知错误',
	},
} as const
