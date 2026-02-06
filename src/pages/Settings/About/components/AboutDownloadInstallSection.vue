<template>
	<SettingsSectionCard title="下载与安装">
		<div class="space-y-4">
			<div class="flex flex-wrap gap-2">
				<UButton
					color="neutral"
					variant="soft"
					icon="i-lucide-external-link"
					@click="onOpenReleasePage">
					打开下载页面
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					icon="i-lucide-copy"
					@click="onCopyReleaseLink">
					复制下载链接
				</UButton>
			</div>

			<div class="grid gap-3 lg:grid-cols-2">
				<div class="rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
					<div class="text-xs text-muted">安装路径</div>
					<div class="truncate text-sm text-default">{{ installPath || '不可用' }}</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-folder-open"
						:disabled="!installPath"
						@click="onOpenInstallPath">
						打开所在文件夹
					</UButton>
				</div>
				<div class="rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
					<div class="text-xs text-muted">数据目录</div>
					<div class="truncate text-sm text-default">{{ dataPath || '不可用' }}</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-folder-open"
						:disabled="!dataPath"
						@click="onOpenDataPath">
						打开数据目录
					</UButton>
				</div>
			</div>

			<UButton
				color="neutral"
				variant="soft"
				icon="i-lucide-stethoscope"
				@click="onExportDiagnostic">
				导出诊断信息
			</UButton>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	defineProps<{
		installPath: string
		dataPath: string
		onOpenReleasePage: () => void
		onCopyReleaseLink: () => void
		onOpenInstallPath: () => void
		onOpenDataPath: () => void
		onExportDiagnostic: () => void
	}>()
</script>
