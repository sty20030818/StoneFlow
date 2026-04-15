import vue from 'eslint-plugin-vue'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

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
			'src-tauri/**',
			'Documents/**',
			'openspec/**',
			'release-output/**',
		],
	},

	// 为 ESLint 补位规则提供 TS 解析能力
	{
		files: ['**/*.{ts,tsx,js,jsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
			},
		},
	},

	// Vue 模板与 SFC 结构规则继续交给 ESLint
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
		},
		rules: {
			...vue.configs['flat/recommended'].rules,
			'vue/block-order': [
				'error',
				{
					order: ['template', 'script', 'style'],
				},
			],
		},
	},

	// Header 壳层的 AST 约束暂时保留在 ESLint
	{
		files: ['src/app/layout/header/**/*.{ts,tsx,vue}'],
		rules: {
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

	// Vue 模板层约束暂时保留在 ESLint
	{
		files: ['src/**/*.vue'],
		plugins: {
			vue,
		},
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
]
