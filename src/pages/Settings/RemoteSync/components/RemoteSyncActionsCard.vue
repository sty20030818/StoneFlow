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
				<div class="text-center text-[10px] text-muted/80 leading-5">{{ lastPushSummaryText }}</div>
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
				<div class="text-center text-[10px] text-muted/80 leading-5">{{ lastPullSummaryText }}</div>
			</div>
		</div>

		<div class="mt-4 space-y-2">
			<div class="flex items-center justify-between gap-2">
				<div class="text-[11px] text-muted">最近同步记录</div>
				<div class="flex items-center gap-2">
					<USelectMenu
						:model-value="historyFilter"
						:options="historyFilterOptions"
						value-attribute="value"
						option-attribute="label"
						size="xs"
						@update:model-value="(value) => onUpdateHistoryFilter(value as 'all' | 'push' | 'pull')" />
					<UButton
						color="neutral"
						variant="ghost"
						size="2xs"
						icon="i-lucide-trash-2"
						:loading="isClearingHistory"
						:disabled="recentSyncHistory.length === 0"
						@click="onClearHistory">
						清空
					</UButton>
				</div>
			</div>
			<div
				v-if="recentSyncHistory.length === 0"
				class="rounded-xl border border-default/70 bg-elevated/40 px-3 py-2 text-[11px] text-muted/80">
				暂无同步记录
			</div>
			<template v-else>
				<div
					v-for="item in recentSyncHistory"
					:key="item.id"
					class="rounded-xl border border-default/70 bg-elevated/40 px-3 py-2">
					<div class="flex items-center justify-between gap-2 text-[11px] text-muted">
						<div class="truncate">{{ item.directionText }} · {{ item.profileName }}</div>
						<div class="shrink-0 flex items-center gap-1.5">
							<div class="text-[10px] text-muted/80">{{ item.syncedAtText }}</div>
							<UButton
								color="neutral"
								variant="ghost"
								size="2xs"
								@click="toggleExpand(item.id)">
								{{ expandedHistoryId === item.id ? '收起' : '明细' }}
							</UButton>
						</div>
					</div>
					<div class="mt-1 text-[10px] leading-5 text-muted/80">{{ item.summary }}</div>
					<div
						v-if="expandedHistoryId === item.id"
						class="mt-2 rounded-lg border border-default/70 bg-default px-2 py-2 space-y-1">
						<div
							v-for="table in item.tables"
							:key="table.key"
							class="flex items-center justify-between gap-2 text-[10px] text-muted">
							<div>{{ table.label }}</div>
							<div class="shrink-0">
								总 {{ table.total }} / 新增 {{ table.inserted }} / 更新 {{ table.updated }} / 跳过 {{ table.skipped }}
							</div>
						</div>
					</div>
				</div>
			</template>
		</div>

		<div
			v-if="syncError"
			class="mt-3 rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
			同步失败：{{ syncError }}
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import { ref } from 'vue'

	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	defineProps<{
		isPushing: boolean
		isPulling: boolean
		hasActiveProfile: boolean
		syncError: string | null
		lastPushedText: string
		lastPulledText: string
		lastPushSummaryText: string
		lastPullSummaryText: string
		historyFilter: 'all' | 'push' | 'pull'
		historyFilterOptions: Array<{ label: string; value: 'all' | 'push' | 'pull' }>
		isClearingHistory: boolean
		recentSyncHistory: Array<{
			id: string
			direction: 'push' | 'pull'
			directionText: string
			profileName: string
			syncedAtText: string
			summary: string
			tables: Array<{
				key: string
				label: string
				total: number
				inserted: number
				updated: number
				skipped: number
			}>
		}>
		onUpdateHistoryFilter: (value: 'all' | 'push' | 'pull') => void
		onClearHistory: () => void
		onPush: () => void
		onPull: () => void
	}>()

	const expandedHistoryId = ref<string | null>(null)

	function toggleExpand(id: string) {
		expandedHistoryId.value = expandedHistoryId.value === id ? null : id
	}
</script>
