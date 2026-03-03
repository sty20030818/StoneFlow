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

	// 页面层边界：禁止页面直接访问底层 API（迁移白名单除外）
	{
		files: ['src/pages/**/*.{ts,tsx,vue}'],
		ignores: [
			'src/pages/assets/**',
			'src/pages/review/**',
			'src/pages/Trash/**',
			'src/pages/ProjectView/**',
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@/services/api', '@/services/api/*', '@/services/api/**'],
							message: '页面层禁止直接导入 services/api，请改为通过 features 公开入口访问数据能力。',
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
							regex: '^@/features/[^/]+/(?!index(?:\\.ts)?$|model(?:/index(?:\\.ts)?)?$).+',
							message: '跨 feature 只能导入公开入口：@/features/<domain> 或 @/features/<domain>/model',
						},
					],
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
