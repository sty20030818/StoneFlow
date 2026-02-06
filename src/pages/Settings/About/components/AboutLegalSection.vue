<template>
	<SettingsSectionCard title="法律与致谢">
		<div class="space-y-3">
			<div class="text-sm text-muted">开源协议：MIT（详见仓库 LICENSE）</div>
			<div class="flex flex-wrap gap-2">
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-file-text"
					@click="onOpenLink(licenseUrl)">
					开源协议
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					size="xs"
					icon="i-lucide-shield"
					@click="onOpenLink(privacyUrl)">
					隐私说明
				</UButton>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	defineProps<{
		licenseUrl: string
		privacyUrl: string
		onOpenLink: (url: string) => void
	}>()
</script>
