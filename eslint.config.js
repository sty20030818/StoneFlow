import vue from 'eslint-plugin-vue'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import vueParser from 'vue-eslint-parser'
import prettierConfig from 'eslint-config-prettier'

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
	{
		ignores: [
			'node_modules/**',
			'dist/**',
			'.cursor/**',
			'.vscode/**',
			'auto-imports.d.ts',
			'components.d.ts',
			'src-tauri/target/**',
			'src-tauri/gen/**',
			'src-tauri/icons/**',
			'src-tauri/.cargo/**',
		],
	},

	// Vue SFC（template + script）
	{
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: 'latest',
				sourceType: 'module',
				extraFileExtensions: ['.vue'],
			},
		},
		plugins: {
			vue,
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			...vue.configs['flat/recommended'].rules,
			// 你要求的顶层块顺序：template > script > style
			'vue/block-order': [
				'error',
				{
					order: ['template', 'script', 'style'],
				},
			],

			// TS 约束（不依赖 type-aware，噪音低）
			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					disallowTypeAnnotations: false,
					fixStyle: 'separate-type-imports',
				},
			],
			'@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/ban-ts-comment': [
				'warn',
				{
					'ts-ignore': 'allow-with-description',
					'ts-expect-error': 'allow-with-description',
					'ts-nocheck': 'allow-with-description',
					'ts-check': false,
					minimumDescriptionLength: 3,
				},
			],
			'@typescript-eslint/prefer-ts-expect-error': 'warn',
		},
	},

	// TS/JS
	{
		files: ['**/*.{ts,tsx,js,jsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
		},
		rules: {
			// 你的 tsconfig 已开启 noUnusedLocals/noUnusedParameters，这里避免重复报噪
			'@typescript-eslint/no-unused-vars': 'off',

			'@typescript-eslint/consistent-type-imports': [
				'warn',
				{
					prefer: 'type-imports',
					disallowTypeAnnotations: false,
					fixStyle: 'separate-type-imports',
				},
			],
			'@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/ban-ts-comment': [
				'warn',
				{
					'ts-ignore': 'allow-with-description',
					'ts-expect-error': 'allow-with-description',
					'ts-nocheck': 'allow-with-description',
					'ts-check': false,
					minimumDescriptionLength: 3,
				},
			],
			'@typescript-eslint/prefer-ts-expect-error': 'warn',
		},
	},

	// 非 feature 层边界：禁止直接访问底层 API
	{
		files: ['src/**/*.{ts,tsx,vue}'],
		ignores: ['src/features/**', 'src/services/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/services/api', '@/services/api/*', '@/services/api/**'],
							message: '页面层禁止直接导入 services/api，请改为通过 features 公开入口访问数据能力。',
						},
						{
							regex: '^(?:\\.{1,2}/)+(?:.*?/)?services/api(?:/.*)?$',
							message: '页面层禁止通过相对路径导入 services/api，请改为通过 features 公开入口访问数据能力。',
						},
					],
				},
			],
		},
	},

	// 页面层边界：禁止直接访问 services/api 与 stores
	{
		files: ['src/pages/**/*.{ts,tsx,vue}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/services/api', '@/services/api/*', '@/services/api/**'],
							message: '页面层禁止直接导入 services/api，请改为通过 features 公开入口访问数据能力。',
						},
						{
							regex: '^(?:\\.{1,2}/)+(?:.*?/)?services/api(?:/.*)?$',
							message: '页面层禁止通过相对路径导入 services/api，请改为通过 features 公开入口访问数据能力。',
						},
						{
							group: ['@/stores', '@/stores/*', '@/stores/**'],
							message: '页面层应优先通过 features 编排能力访问状态，避免直接耦合 store。',
						},
					],
				},
			],
		},
	},

	// 壳层头部公开入口：禁止套件外直接导入内部实现
	{
		files: ['src/**/*.{ts,tsx,vue}'],
		ignores: ['src/app/shell-header/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: '^@/app/shell-header/(?!index(?:\\.ts)?$).+',
							message: '套件外禁止直接导入 shell-header 内部实现，请改用 @/app/shell-header 公开入口。',
						},
					],
				},
			],
		},
	},

	// Header 壳层边界：禁止重新耦合 Feature 与路径特判
	{
		files: ['src/layouts/Header.vue', 'src/layouts/header/**/*.{ts,tsx,vue}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/features', '@/features/*', '@/features/**'],
							message: 'Header 壳层禁止直接依赖 feature 实现，请改为消费 @/app/shell-header 协议或系统级 store。',
						},
					],
				},
			],
			'no-restricted-syntax': [
				'error',
				{
					selector: "MemberExpression[object.name='route'][property.name='path']",
					message: 'Header 壳层禁止通过 route.path 做业务特判，请改为消费已注册的 shell-header 状态。',
				},
				{
					selector: "MemberExpression[object.name='route'][property.name='name']",
					message: 'Header 壳层禁止通过 route.name 做业务特判，请改为消费已注册的 shell-header 状态。',
				},
			],
		},
	},

	// 套件迁移边界：禁止继续依赖旧 settings 路径，并阻断套件外穿透内部实现
	{
		files: ['src/**/*.{ts,tsx,vue}'],
		ignores: ['src/features/settings/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@/features/settings-core',
								'@/features/settings-core/*',
								'@/features/settings-core/**',
								'@/features/settings-about',
								'@/features/settings-about/*',
								'@/features/settings-about/**',
								'@/features/remote-sync',
								'@/features/remote-sync/*',
								'@/features/remote-sync/**',
							],
							message: '旧 settings feature 已废弃，请改用 @/features/settings 公开入口。',
						},
						{
							regex: '^@/features/settings/(?!index(?:\\.ts)?$).+',
							message: '套件外禁止直接导入 settings 内部实现，请改用 @/features/settings 公开入口。',
						},
					],
				},
			],
		},
	},

	// 套件迁移边界：禁止继续依赖旧 assets 路径，并阻断套件外穿透内部实现
	{
		files: ['src/**/*.{ts,tsx,vue}'],
		ignores: ['src/features/assets/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@/features/assets-diary',
								'@/features/assets-diary/*',
								'@/features/assets-diary/**',
								'@/features/assets-notes',
								'@/features/assets-notes/*',
								'@/features/assets-notes/**',
								'@/features/assets-snippets',
								'@/features/assets-snippets/*',
								'@/features/assets-snippets/**',
								'@/features/assets-vault',
								'@/features/assets-vault/*',
								'@/features/assets-vault/**',
								'@/features/assets-shared',
								'@/features/assets-shared/*',
								'@/features/assets-shared/**',
							],
							message: '旧 assets feature 已废弃，请改用 @/features/assets 公开入口。',
						},
						{
							regex: '^@/features/assets/(?!index(?:\\.ts)?$).+',
							message: '套件外禁止直接导入 assets 内部实现，请改用 @/features/assets 公开入口。',
						},
					],
				},
			],
		},
	},

	// 套件迁移边界：禁止继续依赖 workspace 旧根层目录，并阻断套件外穿透内部实现
	{
		files: ['src/**/*.{ts,tsx,vue}'],
		ignores: ['src/features/workspace/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@/features/workspace/composables',
								'@/features/workspace/composables/*',
								'@/features/workspace/composables/**',
								'@/features/workspace/model',
								'@/features/workspace/model/*',
								'@/features/workspace/model/**',
								'@/features/workspace/queries',
								'@/features/workspace/queries/*',
								'@/features/workspace/queries/**',
								'@/features/workspace/mutations',
								'@/features/workspace/mutations/*',
								'@/features/workspace/mutations/**',
								'@/features/workspace/ui',
								'@/features/workspace/ui/*',
								'@/features/workspace/ui/**',
							],
							message:
								'旧 workspace 根层内部目录已废弃，请改用 @/features/workspace 或 @/features/workspace/shared/model。',
						},
						{
							regex: '^@/features/workspace/(?!index(?:\\.ts)?$|shared/model(?:/index(?:\\.ts)?)?$).+',
							message:
								'套件外禁止直接导入 workspace 内部实现，请改用 @/features/workspace 或 @/features/workspace/shared/model。',
						},
					],
				},
			],
		},
	},

	// 大页面 index 迁移后：禁止回流到页面 partials
	{
		files: [
			'src/pages/ReviewLogsPage.vue',
			'src/pages/ReviewStatsPage.vue',
			'src/pages/ReviewFinishListPage.vue',
			'src/pages/SettingsRemoteSyncPage.vue',
			'src/pages/AssetsDiaryPage.vue',
			'src/pages/AssetsNotesPage.vue',
			'src/pages/AssetsSnippetsPage.vue',
			'src/pages/AssetsVaultPage.vue',
			'src/pages/TrashPage.vue',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: '^(?:\\.{1,2}/)+(?:.*?/)?partials(?:/.*)?$',
							message: '页面 index 迁移后禁止直接依赖 partials，请改为使用 feature 页面内容组件。',
						},
						{
							regex: '^@/pages/.+/partials(?:/.*)?$',
							message: '页面 index 迁移后禁止直接依赖 partials，请改为使用 feature 页面内容组件。',
						},
					],
				},
			],
		},
	},

	// 配置层边界：禁止直接依赖 i18n 插件实例
	{
		files: ['src/config/**/*.{ts,tsx,vue}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/i18n', '@/i18n/*', '@/i18n/**'],
							message: 'config 层禁止直接导入 i18n 实例，请改用 key 或中立翻译桥接函数。',
						},
						{
							group: ['@/plugins/i18n', '@/plugins/i18n/*', '@/plugins/i18n/**'],
							message: 'config 层禁止直接导入 i18n 插件实例，请改用 key 或中立翻译桥接函数。',
						},
					],
				},
			],
		},
	},

	// 功能域边界：禁止跨 feature 导入内部实现，仅允许公开入口
	{
		files: ['src/features/**/*.{ts,tsx,vue}'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							regex: '^@/features/[^/]+/(?!index(?:\\.ts)?$|(?:[^/]+/)?model(?:/index(?:\\.ts)?)?$).+',
							message: '跨 feature 只能导入公开入口：@/features/<domain> 或 @/features/<domain>/<subdomain>/model',
						},
					],
				},
			],
		},
	},

	// Shell Header 旧模式阻断：禁止 Teleport 到固定头部 portal
	{
		files: ['src/**/*.vue'],
		rules: {
			'vue/no-restricted-static-attribute': [
				'error',
				{
					element: 'Teleport',
					key: 'to',
					value: '#header-actions-portal',
					message: '头部动作禁止通过固定 portal id 注入，请改用 shell-header 的 rightActions 注册协议。',
				},
				{
					key: 'id',
					value: 'header-actions-portal',
					message: '禁止新增固定 header portal 宿主，请改用 shell-header 动作宿主。',
				},
			],
		},
	},

	// 声明文件：允许 any/ts 注释（放在靠后位置，覆盖上面的 TS 规则）
	{
		files: ['**/*.d.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
		},
	},

	// 关闭与 Prettier 冲突的格式规则
	prettierConfig,
]
