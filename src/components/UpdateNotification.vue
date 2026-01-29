<template>
	<UModal
		v-model:open="isOpen"
		title="发现新版本 🎉"
		:close="false"
		:dismissible="false">
		<template #content>
			<div class="p-6 space-y-4">
				<!-- 版本信息 -->
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted">新版本</span>
					<UBadge
						color="primary"
						variant="subtle"
						size="lg">
						v{{ state.version }}
					</UBadge>
				</div>

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

				<!-- 操作按钮 -->
				<div class="flex gap-3 pt-2">
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
						@click="downloadAndInstall">
						立即更新
					</UButton>
					<UButton
						v-if="state.status === 'ready'"
						color="primary"
						class="flex-1"
						@click="restartApp">
						重启应用
					</UButton>
				</div>

				<!-- 错误提示 -->
				<div
					v-if="state.error"
					class="text-sm text-error">
					{{ state.error }}
				</div>
			</div>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useUpdater } from '@/composables/useUpdater'

	const { state, downloadAndInstall, restartApp, dismiss } = useUpdater()

	const isOpen = computed({
		get: () => state.value.available && state.value.status !== 'checking',
		set: (v) => {
			if (!v) dismiss()
		},
	})
</script>
