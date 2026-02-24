<template>
	<SettingsSectionCard :title="t('settings.about.download.title')">
		<div class="space-y-4">
			<div class="flex flex-wrap gap-2">
				<UButton
					color="neutral"
					variant="soft"
					icon="i-lucide-external-link"
					@click="onOpenReleasePage">
					{{ t('settings.about.download.actions.openReleasePage') }}
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					icon="i-lucide-copy"
					@click="onCopyReleaseLink">
					{{ t('settings.about.download.actions.copyReleaseLink') }}
				</UButton>
			</div>

			<div class="grid gap-3 lg:grid-cols-2">
				<div class="rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
					<div class="text-xs text-muted">{{ t('settings.about.download.installPath') }}</div>
					<div class="truncate text-sm text-default">
						{{ installPath || t('settings.about.download.unavailable') }}
					</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-folder-open"
						:disabled="!installPath"
						@click="onOpenInstallPath">
						{{ t('settings.about.download.actions.openFolder') }}
					</UButton>
				</div>
				<div class="rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
					<div class="text-xs text-muted">{{ t('settings.about.download.dataPath') }}</div>
					<div class="truncate text-sm text-default">
						{{ dataPath || t('settings.about.download.unavailable') }}
					</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-folder-open"
						:disabled="!dataPath"
						@click="onOpenDataPath">
						{{ t('settings.about.download.actions.openDataDir') }}
					</UButton>
				</div>
			</div>

			<UButton
				color="neutral"
				variant="soft"
				icon="i-lucide-stethoscope"
				@click="onExportDiagnostic">
				{{ t('settings.about.download.actions.exportDiagnostic') }}
			</UButton>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	const { t } = useI18n({ useScope: 'global' })

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
