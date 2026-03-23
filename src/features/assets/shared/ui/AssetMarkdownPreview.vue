<template>
	<div
		class="asset-markdown-preview prose prose-slate max-w-none"
		v-html="renderedHtml" />
</template>

<script setup lang="ts">
	import DOMPurify from 'dompurify'
	import { createMarkdownExit } from 'markdown-exit'
	import { computed } from 'vue'

	const props = defineProps<{
		source: string
	}>()

	const markdown = createMarkdownExit({
		breaks: true,
	})

	const renderedHtml = computed(() => {
		const source = props.source.trim()
		if (!source) return '<p>暂无内容</p>'
		return DOMPurify.sanitize(markdown.render(source), {
			USE_PROFILES: { html: true },
		})
	})
</script>

<style scoped>
	.asset-markdown-preview {
		min-height: 100%;
		padding: 1.1rem 1.2rem;
		border: 1px solid rgb(226 232 240 / 0.9);
		border-radius: 1.45rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), rgb(248 250 252 / 0.92)),
			radial-gradient(circle at top, rgb(167 243 208 / 0.12), transparent 40%);
		color: rgb(15 23 42);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.85),
			0 14px 28px rgb(15 23 42 / 0.05);
	}

	.asset-markdown-preview :deep(pre) {
		border-radius: 1rem;
		background: rgb(15 23 42);
	}

	.asset-markdown-preview :deep(code) {
		font-size: 0.83em;
	}
</style>
