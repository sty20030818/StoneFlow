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
	spaces: {
		work: 'Work',
		personal: 'Personal',
		study: 'Study',
		unknown: 'Unknown Space',
	},
	routes: {
		startupGate: {
			title: 'Startup Gate',
			description: 'Startup route placeholder; startup flow resolves final destination',
		},
		space: {
			title: 'Space',
			description: 'Task workspace',
		},
		settings: {
			title: 'Settings',
			description: 'App preferences',
		},
		settingsAbout: {
			title: 'About',
			description: 'Version, updates, and app information',
		},
		settingsRemoteSync: {
			title: 'Remote Sync',
			description: 'Sync configuration and upload/download',
		},
	},
	nav: {
		groups: {
			system: 'System',
			projectTree: 'Project Tree',
			library: 'Library',
			workspace: 'Workspace',
			review: 'Review',
			assets: 'Assets',
			settings: 'Settings',
		},
		pages: {
			allTasks: {
				title: 'All Tasks',
				description: 'All task list',
			},
			finishList: {
				title: 'Finish List',
				description: 'Completed tasks',
			},
			stats: {
				title: 'Stats',
				description: 'Statistics',
			},
			logs: {
				title: 'Logs',
				description: 'Operation logs',
			},
			snippets: {
				title: 'Snippets',
				description: 'Code snippets',
			},
			vault: {
				title: 'Vault',
				description: 'Secure storage',
			},
			notes: {
				title: 'Notes',
				description: 'Notebook',
			},
			diary: {
				title: 'Diary',
				description: 'Work journal',
			},
			trash: {
				title: 'Trash',
				description: 'Recycle bin',
			},
		},
		settings: {
			title: 'Settings',
			description: 'Manage app config and about info',
			about: {
				title: 'About',
				description: 'Version, updates, downloads, and links',
			},
			remoteSync: {
				title: 'Remote Sync',
				description: 'Neon config and upload/download',
			},
		},
	},
	commandPalette: {
		title: 'Command Palette',
		description: 'Search pages and run quick actions',
		placeholder: 'Search pages or actions...',
		items: {
			allTasks: 'All Tasks',
			finishList: 'Finish List',
			stats: 'Stats',
			logs: 'Logs',
			snippets: 'Snippets',
			vault: 'Vault',
			notes: 'Notes',
			about: 'About',
			remoteSync: 'Remote Sync',
		},
	},
	header: {
		searchPlaceholder: 'Search tasks...',
		filter: 'Filter',
		sort: 'Sort',
		edit: 'Edit',
		cancelEdit: 'Cancel',
		delete: 'Delete',
	},
	sidebar: {
		projectsEmpty: 'No projects in this space yet',
	},
	modals: {
		createTask: {
			title: 'New Task',
			description: 'Quickly create a new task',
			fields: {
				title: 'Title',
				space: 'Space',
				project: 'Project',
				status: 'Status',
				priority: 'Priority',
				deadline: 'Deadline',
				doneReason: 'Completion Type',
				tags: 'Tags (Optional)',
				links: 'Links (Optional)',
				note: 'Note (Optional)',
				advanced: 'Advanced',
			},
			placeholders: {
				title: 'Enter task title...',
				tag: 'Type a tag and press Enter',
				linkTitle: 'Title (Optional)',
				linkUrl: 'URL (Required)',
				note: 'Add context, ideas, or links...',
				customFieldTitle: 'Title',
				customFieldValue: 'Content (Optional)',
			},
			empty: {
				links: 'No links',
				customFields: 'No custom fields',
			},
			buttons: {
				cancel: 'Cancel',
				submit: 'Create Task',
				remove: 'Remove',
				addLink: 'Add Link',
				addCustomField: 'Add Custom Field',
				removeField: 'Remove Field',
			},
		},
		createProject: {
			title: 'New Project',
			description: 'Create a new project container',
			fields: {
				title: 'Project Title',
				space: 'Space',
				parentProject: 'Parent Project',
				priority: 'Priority',
				tags: 'Tags (Optional)',
				links: 'Links (Optional)',
				note: 'Note',
			},
			placeholders: {
				title: 'e.g. Q3 Roadmap',
				tag: 'Type a tag and press Enter',
				linkTitle: 'Title (Optional)',
				linkUrl: 'URL (Required)',
				note: 'What is the goal of this project?',
			},
			empty: {
				links: 'No links',
			},
			buttons: {
				cancel: 'Cancel',
				submit: 'Create Project',
				remove: 'Remove',
				addLink: 'Add Link',
			},
		},
		deleteProject: {
			title: 'Confirm Delete',
			description: 'Confirm deleting this project',
			body: 'Project "{name}" will be moved to Trash and can be restored later.',
			editProject: 'Edit Project',
			deleteProject: 'Delete',
			cancel: 'Cancel',
			confirmDelete: 'Confirm Delete',
		},
	},
	linkKind: {
		web: 'Web',
		doc: 'Doc',
		design: 'Design',
		repoLocal: 'Repo (Local)',
		repoRemote: 'Repo (Remote)',
		other: 'Other',
	},
	toast: {
		common: {
			createTaskFailed: 'Failed to create task',
			createProjectFailed: 'Failed to create project',
		},
		projectTree: {
			cannotEditTitle: 'Cannot edit project',
			cannotEditDescription: 'Project details not found, please try again later',
			deletedTitle: 'Moved to Trash',
			deleteFailedTitle: 'Delete failed',
		},
		settingsActions: {
			copyFailedTitle: 'Copy failed',
			openFailedTitle: 'Open failed',
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
		labels: {
			uncategorized: 'Uncategorized',
			projectRoot: 'Project Root',
		},
	},
	fallback: {
		unknownError: 'Unknown error',
	},
} as const
