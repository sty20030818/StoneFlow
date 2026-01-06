/** @type {import('prettier').Config} */
export default {
	// 最大打印宽度（超过则换行）
	printWidth: 120,
	// 一个缩进级别等于 2 个空格（useTabs=true 时用于对齐）
	tabWidth: 2,
	// 使用制表符缩进
	useTabs: true,
	// 语句末尾不加分号
	semi: false,
	// 使用单引号
	singleQuote: true,
	// 对象属性引号策略：consistent = 如果有一个属性需要引号，则所有属性都加引号
	quoteProps: 'as-needed',
	// 在多行结构的最后一个元素后也加尾随逗号
	trailingComma: 'all',
	// 对象花括号内保留空格：{ foo: bar }
	bracketSpacing: true,
	// 多行元素的右括号是否与最后一行内容同一行
	bracketSameLine: true,
	// Vue/JSX 中单个属性是否独占一行
	singleAttributePerLine: true,
	// 箭头函数参数总是加括号
	arrowParens: 'always',
	// 仅在文件头包含特殊注释时才格式化
	requirePragma: false,
	// 在文件头插入特殊注释以表明已被 Prettier 格式化
	insertPragma: false,
	// Markdown 文本的换行策略
	proseWrap: 'preserve',
	// 嵌入的代码片段的格式化方式（如 Markdown 中的代码块）
	embeddedLanguageFormatting: 'auto',
	// HTML 中的空白敏感度
	htmlWhitespaceSensitivity: 'css',
	// 在 Vue 中缩进 <script> 与 <style> 内容
	vueIndentScriptAndStyle: true,
	// 统一使用 LF 换行符
	endOfLine: 'lf',
	// JSX 中使用单引号
	jsxSingleQuote: true,
	overrides: [
		{
			files: '*.json',
			options: {
				printWidth: 80,
			},
		},
		{
			files: '*.md',
			options: {
				printWidth: 80,
				proseWrap: 'always',
			},
		},
		{
			files: '*.vue',
			options: {
				parser: 'vue',
				bracketSameLine: true,
				singleAttributePerLine: true,
				htmlWhitespaceSensitivity: 'ignore',
			},
		},
		{
			files: '*.ts',
			options: {
				parser: 'typescript',
			},
		},
		{
			files: '*.css',
			options: {
				parser: 'css',
				singleQuote: false,
				useTabs: true,
			},
		},
		{
			files: '*.{yml,yaml}',
			options: {
				parser: 'yaml',
				singleQuote: false,
				tabWidth: 2,
			},
		},
	],
}
