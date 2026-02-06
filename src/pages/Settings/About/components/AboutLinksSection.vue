<template>
	<SettingsSectionCard title="链接">
		<div class="space-y-2">
			<div
				v-for="link in links"
				:key="link.id"
				class="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
				<div class="min-w-0">
					<div class="text-sm font-medium text-default">{{ link.label }}</div>
					<div class="truncate text-xs text-muted">{{ link.value }}</div>
				</div>
				<div class="flex items-center gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-external-link"
						@click="onOpenLink(link.value)">
						打开
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-copy"
						@click="onCopyLink(link.value, `${link.label} 链接已复制`)">
						复制
					</UButton>
				</div>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	type AboutLink = {
		id: string
		label: string
		value: string
	}

	defineProps<{
		links: AboutLink[]
		onOpenLink: (url: string) => void
		onCopyLink: (text: string, successMessage: string) => void
	}>()
</script>
