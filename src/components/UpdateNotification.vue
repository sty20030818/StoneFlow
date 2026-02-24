<template>
	<UModal
		v-model:open="isOpen"
		:title="t('updateNotification.title', { version: state.version })"
		:description="t('updateNotification.description')"
		:close="false"
		:dismissible="false"
		:ui="updateModalUi">
		<template #body>
			<div class="space-y-4">
				<!-- 更新日志 -->
				<div
					v-if="renderedNotes"
					class="text-sm text-muted bg-elevated rounded-lg p-3">
					<div class="font-medium mb-2">{{ t('updateNotification.notesTitle') }}</div>
					<div
						class="leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-primary [&_a]:underline"
						v-html="renderedNotes" />
				</div>

				<!-- 下载进度 -->
				<div
					v-if="state.status === 'downloading'"
					class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>{{ t('updateNotification.downloading') }}...</span>
						<span>{{ state.progress }}%</span>
					</div>
					<UProgress
						:model-value="state.progress"
						color="primary" />
				</div>

				<!-- 错误提示 -->
				<div
					v-if="state.error"
					class="text-sm text-error">
					{{ state.error }}
				</div>
			</div>
		</template>

		<template #footer>
			<UButton
				v-if="state.status === 'idle'"
				color="neutral"
				variant="outline"
				class="flex-1"
				@click="dismiss">
				{{ t('updateNotification.actions.later') }}
			</UButton>
			<UButton
				v-if="state.status === 'idle'"
				color="primary"
				class="flex-1"
				@click="handleDownloadAndInstall">
				{{ t('updateNotification.actions.updateNow') }}
			</UButton>
			<UButton
				v-if="state.status === 'ready'"
				color="primary"
				class="flex-1"
				@click="restartApp">
				{{ t('updateNotification.actions.restartApp') }}
			</UButton>
			<UButton
				v-if="state.status === 'error'"
				color="neutral"
				variant="outline"
				class="flex-1"
				@click="dismiss">
				{{ t('common.actions.close') }}
			</UButton>
			<UButton
				v-if="state.status === 'error'"
				color="primary"
				class="flex-1"
				@click="handleDownloadAndInstall">
				{{ t('common.actions.retry') }}
			</UButton>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import DOMPurify from 'dompurify'
	import { createMarkdownExit } from 'markdown-exit'
	import { computed } from 'vue'
	import { createModalLayerUi } from '@/config/ui-layer'
	import { useUpdater } from '@/composables/useUpdater'

	const { state, promptInstallEnabled, downloadAndInstall, restartApp, dismiss } = useUpdater()
	const { t } = useI18n({ useScope: 'global' })
	const updateModalUi = createModalLayerUi()
	const markdown = createMarkdownExit({
		html: false,
		linkify: true,
		breaks: true,
	})

	const renderedNotes = computed(() => {
		const source = state.value.notes.trim()
		if (!source) return ''

		const rendered = markdown.render(source)
		return DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } })
	})

	async function handleDownloadAndInstall() {
		await downloadAndInstall()
	}

	const isOpen = computed({
		get: () => promptInstallEnabled.value && state.value.available && state.value.status !== 'checking',
		set: (v) => {
			if (!v) dismiss()
		},
	})
</script>
