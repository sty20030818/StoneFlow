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
				class="rounded-2xl border border-default/70 bg-elevated/20 px-4 py-3">
				<div class="text-sm font-medium text-default">v{{ entry.version }}（{{ entry.date }}）</div>
				<ul class="mt-2 space-y-1 text-sm text-muted">
					<li
						v-for="item in entry.items"
						:key="item">
						- {{ item }}
					</li>
				</ul>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	type ChangelogEntry = {
		version: string
		date: string
		items: string[]
	}

	defineProps<{
		entries: ChangelogEntry[]
		onOpenChangelog: () => void
	}>()
</script>
