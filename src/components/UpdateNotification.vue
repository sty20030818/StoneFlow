<template>
	<UModal
		v-model:open="isOpen"
		:title="`发现新版本 v${state.version}`"
		description="StoneFlow 有新的更新可用"
		:close="false"
		:dismissible="false">
		<template #body>
			<div class="space-y-4">
				<!-- 更新日志 -->
				<div
					v-if="state.notes"
					class="text-sm text-muted bg-elevated rounded-lg p-3">
					<div class="font-medium mb-1">更新内容</div>
					<div class="whitespace-pre-wrap">{{ state.notes }}</div>
				</div>

				<!-- 下载进度 -->
				<div
					v-if="state.status === 'downloading'"
					class="space-y-2">
					<div class="flex justify-between text-sm">
						<span>下载中...</span>
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
			<div class="flex w-full gap-3">
				<UButton
					v-if="state.status === 'idle'"
					color="neutral"
					variant="outline"
					class="flex-1"
					@click="dismiss">
					稍后提醒
				</UButton>
				<UButton
					v-if="state.status === 'idle'"
					color="primary"
					class="flex-1"
					@click="handleDownloadAndInstall">
					立即更新
				</UButton>
				<UButton
					v-if="state.status === 'ready'"
					color="primary"
					class="flex-1"
					@click="restartApp">
					重启应用
				</UButton>
				<UButton
					v-if="state.status === 'error'"
					color="neutral"
					variant="outline"
					class="flex-1"
					@click="dismiss">
					关闭
				</UButton>
				<UButton
					v-if="state.status === 'error'"
					color="primary"
					class="flex-1"
					@click="handleDownloadAndInstall">
					重试
				</UButton>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useUpdater } from '@/composables/useUpdater'

	const { state, promptInstallEnabled, downloadAndInstall, restartApp, dismiss } = useUpdater()

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
