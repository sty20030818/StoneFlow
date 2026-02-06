<template>
	<SettingsSectionCard
		title="同步操作"
		card-class="bg-default">
		<div class="grid grid-cols-2 gap-3">
			<div class="space-y-2">
				<UButton
					block
					color="primary"
					variant="solid"
					size="xl"
					icon="i-lucide-cloud-upload"
					:loading="isPushing"
					:disabled="isPulling || !hasActiveProfile"
					@click="onPush">
					上传
				</UButton>
				<div class="text-center text-[11px] text-muted">最近上传：{{ lastPushedText }}</div>
			</div>
			<div class="space-y-2">
				<UButton
					block
					color="neutral"
					variant="soft"
					size="xl"
					icon="i-lucide-cloud-download"
					:loading="isPulling"
					:disabled="isPushing || !hasActiveProfile"
					@click="onPull">
					下载
				</UButton>
				<div class="text-center text-[11px] text-muted">最近下载：{{ lastPulledText }}</div>
			</div>
		</div>

		<div
			v-if="syncError"
			class="mt-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
			同步失败：{{ syncError }}
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	defineProps<{
		isPushing: boolean
		isPulling: boolean
		hasActiveProfile: boolean
		syncError: string | null
		lastPushedText: string
		lastPulledText: string
		onPush: () => void
		onPull: () => void
	}>()
</script>
