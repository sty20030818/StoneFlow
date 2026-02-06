<template>
	<SettingsSectionCard>
		<div class="space-y-5">
			<div class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-start gap-4">
					<UAvatar
						:src="avatarUrl"
						alt="StoneFlow"
						size="xl"
						:ui="{ root: 'rounded-2xl ring-1 ring-default/50 bg-elevated/60' }" />
					<div class="space-y-4">
						<div class="space-y-2">
							<div class="text-2xl font-semibold text-default">{{ appName }}</div>
							<div class="text-sm text-muted">像 IDE 一样顺手的任务与项目系统</div>
						</div>
						<div class="space-y-2 text-xs text-muted">
							<div class="flex items-start gap-2">
								<UIcon
									name="i-lucide-flag"
									class="mt-0.5 size-3.5 text-primary/80" />
								<span>Task 是行动，Project 是叙事</span>
							</div>
							<div class="flex items-start gap-2">
								<UIcon
									name="i-lucide-check-circle-2"
									class="mt-0.5 size-3.5 text-primary/80" />
								<span>Finish List 记录你走过的路</span>
							</div>
						</div>
						<!-- <div class="flex flex-wrap items-center gap-2">
							<span class="rounded-full bg-sky-400 px-3 py-1 text-xs font-medium text-white">
								🏆 完成系统
							</span>
							<span class="rounded-full bg-fuchsia-400 px-3 py-1 text-xs font-medium text-white">
								🧭 项目骨架
							</span>
							<span class="rounded-full bg-amber-400 px-3 py-1 text-xs font-medium text-white">
								⚡ 高效快捷
							</span>
						</div> -->
					</div>
				</div>

				<div class="w-full max-w-md space-y-3">
					<div class="rounded-3xl border border-default/60 bg-elevated/50 p-4">
						<div class="flex items-start justify-between gap-4">
							<div class="space-y-1">
								<div class="text-xs text-muted">当前版本</div>
								<div class="text-lg font-semibold text-default">v{{ currentVersion }}</div>
								<div
									v-if="buildNumber"
									class="text-xs text-muted">
									Build {{ buildNumber }}
								</div>
								<div class="text-xs text-muted">上次检查：{{ lastCheckedText }}</div>
							</div>
							<UBadge
								color="neutral"
								variant="soft">
								{{ updateStateLabel }}
							</UBadge>
						</div>
						<div class="mt-3 flex flex-wrap gap-2">
							<UButton
								color="primary"
								icon="i-lucide-refresh-cw"
								:loading="isChecking"
								:disabled="isDownloading"
								@click="onCheckUpdate">
								检查更新
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								icon="i-lucide-external-link"
								@click="onOpenReleasePage">
								打开下载页
							</UButton>
							<UButton
								color="neutral"
								variant="ghost"
								icon="i-lucide-scroll-text"
								@click="onOpenChangelog">
								查看更新日志
							</UButton>
						</div>
					</div>

					<div class="rounded-3xl border border-default/60 bg-elevated/30 p-3">
						<button
							type="button"
							class="flex w-full items-center justify-between text-left"
							@click="onToggleAdvanced">
							<span class="text-sm font-medium text-default">更新偏好</span>
							<UIcon
								name="i-lucide-chevron-down"
								class="size-4 text-muted transition-transform"
								:class="advancedOpen ? 'rotate-180' : ''" />
						</button>
						<div
							v-if="advancedOpen"
							class="mt-3 space-y-3 text-sm">
							<label class="flex items-center justify-between gap-3">
								<span class="text-muted">自动检查更新</span>
								<input
									:checked="autoCheckEnabled"
									type="checkbox"
									class="h-4 w-4 rounded"
									@change="onAutoCheckChange" />
							</label>
							<label class="flex items-center justify-between gap-3">
								<span class="text-muted">下载完成后提示安装</span>
								<input
									:checked="promptInstallEnabled"
									type="checkbox"
									class="h-4 w-4 rounded"
									@change="onPromptInstallChange" />
							</label>
							<div class="flex items-center justify-between gap-3">
								<span class="text-muted">更新通道</span>
								<span class="text-default">Tauri Updater</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="space-y-4">
				<div
					v-if="state.error"
					class="rounded-2xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
					{{ state.error }}
				</div>

				<div
					v-if="state.status === 'downloading'"
					class="space-y-2">
					<div class="flex items-center justify-between text-sm text-muted">
						<span>下载中</span>
						<span>{{ state.progress }}%</span>
					</div>
					<UProgress
						:model-value="state.progress"
						color="primary" />
				</div>

				<div class="flex flex-wrap gap-2">
					<UButton
						v-if="state.available"
						color="neutral"
						variant="soft"
						icon="i-lucide-download"
						:loading="isDownloading"
						@click="onDownloadUpdate">
						下载更新
					</UButton>
					<UButton
						v-if="state.status === 'ready'"
						color="neutral"
						variant="soft"
						icon="i-lucide-rotate-cw"
						@click="onRestart">
						重启安装
					</UButton>
				</div>
			</div>
		</div>
	</SettingsSectionCard>
</template>

<script setup lang="ts">
	import avatarUrl from '@/assets/avatar.png'
	import type { UpdateState } from '@/composables/useUpdater'
	import SettingsSectionCard from '@/pages/Settings/components/SettingsSectionCard.vue'

	defineProps<{
		appName: string
		currentVersion: string
		buildNumber: string
		lastCheckedText: string
		updateStateLabel: string
		state: UpdateState
		advancedOpen: boolean
		autoCheckEnabled: boolean
		promptInstallEnabled: boolean
		isChecking: boolean
		isDownloading: boolean
		onToggleAdvanced: () => void
		onCheckUpdate: () => void
		onDownloadUpdate: () => void
		onRestart: () => void
		onOpenReleasePage: () => void
		onOpenChangelog: () => void
		onAutoCheckChange: (event: Event) => void
		onPromptInstallChange: (event: Event) => void
	}>()
</script>
