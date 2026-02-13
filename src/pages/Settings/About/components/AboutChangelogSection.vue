<template>
	<SettingsSectionCard>
		<template #header>
			<div class="flex items-center justify-between gap-3">
				<div class="text-sm font-semibold text-default">变更日志</div>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-external-link"
					@click="onOpenChangelog">
					查看完整变更日志
				</UButton>
			</div>
		</template>

		<div class="space-y-3">
			<div
				v-for="entry in entries"
				:key="entry.version"
				v-motion="changelogItemHoverMotion"
				class="rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3 transition-colors duration-150 hover:bg-elevated/35">
				<div class="text-sm font-medium text-default">v{{ entry.version }}（{{ entry.date }}）</div>
				<div
					class="mt-2 text-sm text-muted leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
					v-html="renderEntryMarkdown(entry.items)" />
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import DOMPurify from 'dompurify'
	import { createMarkdownExit } from 'markdown-exit'
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	type ChangelogEntry = {
		version: string
		date: string
		items: string
	}
	const markdown = createMarkdownExit({
		html: false,
		linkify: true,
		breaks: true,
	})
	const changelogItemHoverMotion = useCardHoverMotionPreset()

	defineProps<{
		entries: ChangelogEntry[]
		onOpenChangelog: () => void
	}>()

	function renderEntryMarkdown(markdownText: string) {
		const source = markdownText.trim()
		if (!source) return ''
		return DOMPurify.sanitize(markdown.render(source), { USE_PROFILES: { html: true } })
	}
</script>
