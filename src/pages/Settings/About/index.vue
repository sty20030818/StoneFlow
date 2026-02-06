<template>
	<section class="space-y-6">
		<UCard class="rounded-3xl border border-default/70 bg-default">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div class="flex items-center gap-4">
					<UAvatar
						:src="avatarUrl"
						alt="StoneFlow"
						size="xl"
						:ui="{ root: 'rounded-2xl shadow-sm' }" />
					<div class="space-y-1">
						<div class="text-xl font-semibold text-default">{{ appName }}</div>
						<div class="text-sm text-muted">本地流程与任务管理工具</div>
					</div>
				</div>

				<div class="w-full max-w-md rounded-2xl border border-default/70 bg-elevated/30 p-4">
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
							:loading="state.status === 'checking'"
							:disabled="state.status === 'downloading'"
							@click="handleCheckUpdate">
							检查更新
						</UButton>
						<UButton
							color="neutral"
							variant="soft"
							icon="i-lucide-copy"
							@click="handleCopyVersion">
							复制版本信息
						</UButton>
					</div>
				</div>
			</div>
		</UCard>

		<UCard class="rounded-3xl border border-default/70 bg-default">
			<template #header>
				<div class="flex items-center justify-between gap-3">
					<div>
						<div class="text-sm font-semibold text-default">更新</div>
						<div class="text-xs text-muted">{{ updateDescription }}</div>
					</div>
					<UBadge
						color="neutral"
						variant="soft">
						{{ updateBadge }}
					</UBadge>
				</div>
			</template>

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
						color="primary"
						icon="i-lucide-refresh-cw"
						:loading="state.status === 'checking'"
						:disabled="state.status === 'downloading'"
						@click="handleCheckUpdate">
						检查更新
					</UButton>
					<UButton
						v-if="state.available"
						color="neutral"
						variant="soft"
						icon="i-lucide-download"
						:loading="state.status === 'downloading'"
						@click="handleDownloadUpdate">
						下载更新
					</UButton>
					<UButton
						v-if="state.status === 'ready'"
						color="neutral"
						variant="soft"
						icon="i-lucide-rotate-cw"
						@click="handleRestart">
						重启安装
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						icon="i-lucide-external-link"
						@click="openReleasePage">
						打开下载页
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						icon="i-lucide-scroll-text"
						@click="openChangelog">
						查看更新内容
					</UButton>
				</div>

				<div class="rounded-2xl border border-default/70 bg-elevated/20 p-3">
					<button
						type="button"
						class="flex w-full items-center justify-between text-left"
						@click="advancedOpen = !advancedOpen">
						<span class="text-sm font-medium text-default">高级</span>
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
								@change="handleAutoCheckChange" />
						</label>
						<label class="flex items-center justify-between gap-3">
							<span class="text-muted">下载完成后提示安装</span>
							<input
								:checked="promptInstallEnabled"
								type="checkbox"
								class="h-4 w-4 rounded"
								@change="handlePromptInstallChange" />
						</label>
						<div class="flex items-center justify-between gap-3">
							<span class="text-muted">更新来源</span>
							<span class="text-default">Tauri Updater</span>
						</div>
					</div>
				</div>
			</div>
		</UCard>

		<UCard class="rounded-3xl border border-default/70 bg-default">
			<template #header>
				<div class="text-sm font-semibold text-default">下载与安装</div>
			</template>
			<div class="space-y-4">
				<div class="flex flex-wrap gap-2">
					<UButton
						color="neutral"
						variant="soft"
						icon="i-lucide-external-link"
						@click="openReleasePage">
						打开下载页面
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						icon="i-lucide-copy"
						@click="handleCopyReleaseLink">
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
							@click="openInstallPath">
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
							@click="openDataPath">
							打开数据目录
						</UButton>
					</div>
				</div>

				<UButton
					color="neutral"
					variant="soft"
					icon="i-lucide-stethoscope"
					@click="exportDiagnostic">
					导出诊断信息
				</UButton>
			</div>
		</UCard>

		<UCard
			id="about-changelog"
			class="rounded-3xl border border-default/70 bg-default">
			<template #header>
				<div class="flex items-center justify-between gap-3">
					<div class="text-sm font-semibold text-default">变更日志</div>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-external-link"
						@click="openChangelog">
						查看完整变更日志
					</UButton>
				</div>
			</template>

			<div class="space-y-3">
				<div
					v-for="entry in changelogSummary"
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
		</UCard>

		<UCard class="rounded-3xl border border-default/70 bg-default">
			<template #header>
				<div class="text-sm font-semibold text-default">链接</div>
			</template>
			<div class="space-y-2">
				<div
					v-for="link in aboutLinks"
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
							@click="openUrl(link.value)">
							打开
						</UButton>
						<UButton
							color="neutral"
							variant="ghost"
							size="xs"
							icon="i-lucide-copy"
							@click="copy(link.value, `${link.label} 链接已复制`)">
							复制
						</UButton>
					</div>
				</div>
			</div>
		</UCard>

		<UCard class="rounded-3xl border border-default/70 bg-default">
			<template #header>
				<button
					type="button"
					class="flex w-full items-center justify-between text-left"
					@click="legalOpen = !legalOpen">
					<span class="text-sm font-semibold text-default">法律与致谢</span>
					<UIcon
						name="i-lucide-chevron-down"
						class="size-4 text-muted transition-transform"
						:class="legalOpen ? 'rotate-180' : ''" />
				</button>
			</template>
			<div
				v-if="legalOpen"
				class="space-y-3">
				<div class="text-sm text-muted">开源协议：MIT（详见仓库 LICENSE）</div>
				<div class="flex flex-wrap gap-2">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-file-text"
						@click="openUrl(licenseUrl)">
						开源协议
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-shield"
						@click="openUrl(privacyUrl)">
						隐私说明
					</UButton>
				</div>
			</div>
		</UCard>
	</section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import avatarUrl from '@/assets/avatar.png'
import { useUpdater } from '@/composables/useUpdater'
import { copyText, openExternalUrl, openLocalPath } from '@/services/tauri/system-actions'
import { getIdentifier, getName, getVersion } from '@tauri-apps/api/app'
import { appLocalDataDir, executableDir } from '@tauri-apps/api/path'

import {
	ABOUT_LINKS,
	CHANGELOG_SUMMARY,
	CHANGELOG_URL,
	LICENSE_URL,
	PRIVACY_URL,
	RELEASE_PAGE_URL,
} from './config'

const toast = useToast()
const { state, autoCheckEnabled, promptInstallEnabled, checkForUpdate, downloadAndInstall, restartApp, setAutoCheckEnabled, setPromptInstallEnabled } =
	useUpdater()

const appName = ref('StoneFlow')
const currentVersion = ref('0.0.0')
const identifier = ref('')
const buildNumber = ref(import.meta.env.VITE_BUILD_NUMBER ?? '')
const installPath = ref('')
const dataPath = ref('')

const advancedOpen = ref(false)
const legalOpen = ref(false)

const aboutLinks = ABOUT_LINKS
const changelogSummary = CHANGELOG_SUMMARY
const licenseUrl = LICENSE_URL
const privacyUrl = PRIVACY_URL

const lastCheckedText = computed(() => {
	if (!state.value.lastCheckedAt) return '尚未检查'
	return new Date(state.value.lastCheckedAt).toLocaleString()
})

const updateStateLabel = computed(() => {
	if (state.value.status === 'checking') return '检查中'
	if (state.value.status === 'downloading') return '下载中'
	if (state.value.status === 'ready') return '等待安装'
	if (state.value.status === 'error') return '检查失败'
	if (state.value.available) return '发现更新'
	return '已是最新版'
})

const updateBadge = computed(() => {
	if (state.value.available && state.value.version) return `v${state.value.version}`
	return updateStateLabel.value
})

const updateDescription = computed(() => {
	if (state.value.status === 'checking') return '正在检查更新…'
	if (state.value.status === 'error') return '无法连接更新服务，可稍后重试。'
	if (state.value.status === 'ready') return '下载完成，重启后安装。'
	if (state.value.available && state.value.version) return `发现新版本 v${state.value.version}`
	return '当前已是最新版本。'
})

function buildVersionText() {
	return [
		`app: ${appName.value}`,
		`version: ${currentVersion.value}`,
		buildNumber.value ? `build: ${buildNumber.value}` : null,
		identifier.value ? `identifier: ${identifier.value}` : null,
	].filter(Boolean).join('\n')
}

async function copy(text: string, successMessage: string) {
	try {
		await copyText(text)
		toast.add({ title: successMessage, color: 'success' })
	} catch (error) {
		toast.add({ title: '复制失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
	}
}

async function openUrl(url: string) {
	try {
		await openExternalUrl(url)
	} catch (error) {
		toast.add({ title: '打开失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
	}
}

async function handleCheckUpdate() {
	const hasUpdate = await checkForUpdate()
	if (state.value.status === 'error') return
	toast.add({
		title: hasUpdate ? `发现更新 v${state.value.version}` : '当前已是最新版',
		color: hasUpdate ? 'primary' : 'success',
	})
}

async function handleCopyVersion() {
	await copy(buildVersionText(), '版本信息已复制')
}

async function handleDownloadUpdate() {
	const ok = await downloadAndInstall()
	if (ok) {
		toast.add({ title: '更新下载完成', description: '可重启应用完成安装。', color: 'success' })
	}
}

async function handleRestart() {
	try {
		await restartApp()
	} catch (error) {
		toast.add({ title: '重启失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
	}
}

async function openReleasePage() {
	await openUrl(RELEASE_PAGE_URL)
}

async function openChangelog() {
	await openUrl(CHANGELOG_URL)
}

async function handleCopyReleaseLink() {
	await copy(RELEASE_PAGE_URL, '下载链接已复制')
}

async function openInstallPath() {
	if (!installPath.value) return
	try {
		await openLocalPath(installPath.value)
	} catch (error) {
		toast.add({ title: '打开失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
	}
}

async function openDataPath() {
	if (!dataPath.value) return
	try {
		await openLocalPath(dataPath.value)
	} catch (error) {
		toast.add({ title: '打开失败', description: error instanceof Error ? error.message : '未知错误', color: 'error' })
	}
}

async function exportDiagnostic() {
	const payload = {
		time: new Date().toISOString(),
		appName: appName.value,
		version: currentVersion.value,
		build: buildNumber.value || null,
		identifier: identifier.value || null,
		update: {
			status: state.value.status,
			available: state.value.available,
			targetVersion: state.value.version || null,
			lastCheckedAt: state.value.lastCheckedAt,
			error: state.value.error,
		},
		paths: {
			installPath: installPath.value || null,
			dataPath: dataPath.value || null,
		},
	}

	await copy(JSON.stringify(payload, null, 2), '诊断信息已复制')
}

function handleAutoCheckChange(event: Event) {
	const target = event.target as HTMLInputElement
	setAutoCheckEnabled(target.checked)
}

function handlePromptInstallChange(event: Event) {
	const target = event.target as HTMLInputElement
	setPromptInstallEnabled(target.checked)
}

onMounted(async () => {
	try {
		appName.value = await getName()
	} catch {
		// use fallback
	}
	try {
		currentVersion.value = await getVersion()
	} catch {
		// use fallback
	}
	try {
		identifier.value = await getIdentifier()
	} catch {
		// optional
	}
	try {
		installPath.value = await executableDir()
	} catch {
		// optional
	}
	try {
		dataPath.value = await appLocalDataDir()
	} catch {
		// optional
	}
})
</script>
