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
	spaces: {
		work: '工作',
		personal: '个人',
		study: '学习',
		unknown: '未知空间',
	},
	routes: {
		startupGate: {
			title: '启动网关',
			description: '启动路由占位，由启动流程决定最终目标页面',
		},
		space: {
			title: '空间',
			description: '任务空间',
		},
		settings: {
			title: '设置',
			description: '应用偏好设置',
		},
		settingsAbout: {
			title: '关于',
			description: '版本、更新与应用信息',
		},
		settingsRemoteSync: {
			title: '远端同步',
			description: '同步配置与上传下载',
		},
	},
	nav: {
		groups: {
			system: '系统分组',
			projectTree: '项目树',
			library: '资产库',
			workspace: '工作空间',
			review: '回顾',
			assets: '资产库',
			settings: '设置',
		},
		pages: {
			allTasks: {
				title: '所有任务',
				description: '所有任务列表',
			},
			finishList: {
				title: '完成列表',
				description: '已完成任务',
			},
			stats: {
				title: '统计',
				description: '统计数据',
			},
			logs: {
				title: '日志',
				description: '操作日志',
			},
			snippets: {
				title: '代码片段',
				description: '代码片段',
			},
			vault: {
				title: '密钥库',
				description: '安全存储',
			},
			notes: {
				title: '笔记',
				description: '笔记本',
			},
			diary: {
				title: '日记',
				description: '工作日志',
			},
			trash: {
				title: '回收站',
				description: '回收站',
			},
		},
		settings: {
			title: '设置',
			description: '管理应用配置与关于信息',
			about: {
				title: '关于',
				description: '版本、更新、下载与链接',
			},
			remoteSync: {
				title: '远端同步',
				description: 'Neon 配置与上传下载',
			},
		},
	},
	commandPalette: {
		title: '命令面板',
		description: '搜索页面并执行快捷操作',
		placeholder: '搜索页面或操作...',
		items: {
			allTasks: '所有任务',
			finishList: '完成列表',
			stats: '统计',
			logs: '日志',
			snippets: '代码片段',
			vault: '密钥库',
			notes: '笔记',
			about: '关于',
			remoteSync: '远端同步',
		},
	},
	header: {
		searchPlaceholder: '搜索任务...',
		filter: '筛选',
		sort: '排序',
		edit: '编辑',
		cancelEdit: '取消',
		delete: '删除',
	},
	sidebar: {
		projectsEmpty: '当前 Space 暂无项目',
	},
	modals: {
		createTask: {
			title: '新建任务',
			description: '快速创建一个新任务',
			fields: {
				title: '标题',
				space: '空间',
				project: '项目',
				status: '状态',
				priority: '优先级',
				deadline: '截止时间',
				doneReason: '完成类型',
				tags: '标签（可选）',
				links: '链接（可选）',
				note: '备注（可选）',
				advanced: '高级属性',
			},
			placeholders: {
				title: '输入任务标题...',
				tag: '输入标签后按回车添加',
				linkTitle: '标题（可选）',
				linkUrl: 'URL（必填）',
				note: '记录一些背景信息、想法或链接…',
				customFieldTitle: '标题',
				customFieldValue: '内容（可选）',
			},
			empty: {
				links: '暂无链接',
				customFields: '暂无自定义字段',
			},
			buttons: {
				cancel: '取消',
				submit: '创建任务',
				remove: '移除',
				addLink: '新增链接',
				addCustomField: '新增自定义字段',
				removeField: '移除字段',
			},
		},
		createProject: {
			title: '新建项目',
			description: '创建一个新的项目容器',
			fields: {
				title: '项目标题',
				space: '空间',
				parentProject: '父项目',
				priority: '优先级',
				tags: '标签（可选）',
				links: '链接（可选）',
				note: '备注',
			},
			placeholders: {
				title: '例如：Q3 路线图',
				tag: '输入标签后按回车添加',
				linkTitle: '标题（可选）',
				linkUrl: 'URL（必填）',
				note: '这个项目的目标是什么？',
			},
			empty: {
				links: '暂无链接',
			},
			buttons: {
				cancel: '取消',
				submit: '创建项目',
				remove: '移除',
				addLink: '新增链接',
			},
		},
		deleteProject: {
			title: '确认删除',
			description: '确认是否删除当前项目',
			body: '将删除项目“{name}”，可在回收站恢复。',
			editProject: '编辑项目',
			deleteProject: '删除',
			cancel: '取消',
			confirmDelete: '确认删除',
		},
	},
	linkKind: {
		web: '网页',
		doc: '文档',
		design: '设计稿',
		repoLocal: '本地仓库',
		repoRemote: '远程仓库',
		other: '其他',
	},
	toast: {
		common: {
			createTaskFailed: '创建任务失败',
			createProjectFailed: '创建项目失败',
		},
		projectTree: {
			cannotEditTitle: '无法编辑项目',
			cannotEditDescription: '未找到项目详情，请稍后重试',
			deletedTitle: '已移入回收站',
			deleteFailedTitle: '删除失败',
		},
		settingsActions: {
			copyFailedTitle: '复制失败',
			openFailedTitle: '打开失败',
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
		labels: {
			uncategorized: '未分类',
			projectRoot: '根项目',
		},
	},
	fallback: {
		unknownError: '未知错误',
	},
} as const
