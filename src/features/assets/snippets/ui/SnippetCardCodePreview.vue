<template>
	<pre class="snippet-card-code-preview"><code :class="codeClassName" v-html="highlightedPreviewHtml" /></pre>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { hljs, resolveSnippetPreviewLanguage } from './snippet-card-highlight'

	const props = withDefaults(
		defineProps<{
			content?: string
			language?: string | null
			maxLines?: number
		}>(),
		{
			content: '',
			language: null,
			maxLines: 5,
		},
	)

	function resolvePreviewContent(content: string) {
		return content
			.split('\n')
			.slice(0, props.maxLines)
			.join('\n')
			.replace(/^\n+|\n+$/g, '')
	}

	const previewContent = computed(() => resolvePreviewContent(props.content))
	const resolvedLanguage = computed(() => resolveSnippetPreviewLanguage(props.language))

	const highlightedPreviewHtml = computed(() => {
		if (!previewContent.value) {
			return ''
		}

		if (resolvedLanguage.value) {
			return hljs.highlight(previewContent.value, { language: resolvedLanguage.value }).value
		}

		return hljs.highlightAuto(previewContent.value).value
	})

	const codeClassName = computed(() => {
		const base = 'hljs snippet-card-code-preview__code'
		return resolvedLanguage.value ? `${base} language-${resolvedLanguage.value}` : base
	})
</script>

<style scoped>
	.snippet-card-code-preview {
		margin: 0;
		height: 100%;
		min-height: 100%;
		padding: 0.85rem 0.95rem 1rem;
		font-family: 'Iosevka Comfy', 'Fira Code', 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		line-height: 1.58;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.snippet-card-code-preview :deep(.snippet-card-code-preview__code.hljs) {
		padding: 0;
		background: transparent;
		color: inherit;
		white-space: inherit;
		word-break: inherit;
	}
</style>
