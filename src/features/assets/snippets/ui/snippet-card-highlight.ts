import hljs from 'highlight.js/lib/core'
import 'highlight.js/styles/atom-one-dark.css'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('python', python)
hljs.registerLanguage('rust', rust)

export function resolveSnippetPreviewLanguage(language: string | null) {
	const normalized = language?.trim().toLowerCase() ?? ''
	if (['js', 'jsx', 'javascript'].includes(normalized)) {
		return 'javascript'
	}
	if (['ts', 'tsx', 'typescript'].includes(normalized)) {
		return 'typescript'
	}
	if (normalized === 'json') {
		return 'json'
	}
	if (['html', 'vue', 'xml'].includes(normalized)) {
		return 'xml'
	}
	if (['css', 'scss', 'less'].includes(normalized)) {
		return 'css'
	}
	if (normalized === 'sql') {
		return 'sql'
	}
	if (['py', 'python'].includes(normalized)) {
		return 'python'
	}
	if (['rs', 'rust'].includes(normalized)) {
		return 'rust'
	}
	return null
}

export { hljs }
