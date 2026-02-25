<template>
	<header
		v-motion="headerShellMotion"
		class="z-layer-header shrink-0 px-6 sticky top-0 bg-default/85 backdrop-blur-xl border-b border-default/80">
		<div class="relative h-16 flex items-center justify-between gap-4">
			<!-- 左侧：面包屑 -->
			<div
				v-motion="headerBreadcrumbMotion"
				class="flex items-center gap-2 min-w-0 flex-1">
				<RouterLink
					v-if="leadingPill?.to"
					:to="leadingPill.to"
					class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
					:class="leadingPill.pillClass">
					<UIcon
						:name="leadingPill.icon"
						class="size-3.5 shrink-0 text-white" />
					<span>{{ leadingPill.label }}</span>
				</RouterLink>
				<span
					v-else-if="leadingPill"
					class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
					:class="leadingPill.pillClass">
					<UIcon
						:name="leadingPill.icon"
						class="size-3.5 shrink-0 text-white" />
					<span>{{ leadingPill.label }}</span>
				</span>

				<template v-if="projectTrail.length">
					<template
						v-for="(item, index) in projectTrail"
						:key="`${item.label}-${index}`">
						<UIcon
							name="i-lucide-chevron-right"
							class="size-3.5 text-muted shrink-0" />
						<RouterLink
							v-if="index < projectTrail.length - 1 && item.to"
							:to="item.to"
							class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
							:class="projectPillClass(index)">
							<UIcon
								:name="item.icon ?? projectIcon"
								class="size-3.5 shrink-0 text-white" />
							<span class="truncate max-w-[160px]">{{ item.label }}</span>
						</RouterLink>
						<span
							v-else-if="index < projectTrail.length - 1"
							class="px-3 py-2 rounded-full text-xs font-semibold shrink-0 flex items-center gap-1.5 text-white shadow-sm"
							:class="projectPillClass(index)">
							<UIcon
								:name="item.icon ?? projectIcon"
								class="size-3.5 shrink-0 text-white" />
							<span class="truncate max-w-[160px]">{{ item.label }}</span>
						</span>
						<span
							v-else
							class="text-base font-bold text-default truncate max-w-[400px] flex items-baseline gap-2">
							<span
								v-if="item.icon"
								class="inline-flex items-center gap-2">
								<UIcon
									:name="item.icon"
									class="size-4 text-muted" />
								<span>{{ item.label }}</span>
							</span>
							<span v-else>{{ item.label }}</span>

							<span
								v-if="item.description"
								class="text-xs font-normal text-muted truncate max-w-[300px]">
								{{ item.description }}
							</span>
						</span>
					</template>
				</template>
			</div>

			<!-- 中间：设置页分栏 -->
			<div
				v-if="isSettingsPage"
				class="pointer-events-none absolute left-1/2 -translate-x-1/2">
				<UTabs
					:items="settingsTabItems"
					:model-value="activeSettingsTab"
					:content="false"
					color="neutral"
					variant="pill"
					size="sm"
					class="pointer-events-auto"
					:ui="settingsTabsUi"
					@update:model-value="onSettingsTabChange">
					<template #leading="{ item }">
						<UIcon
							:name="item.icon"
							class="size-3.5"
							:class="activeSettingsTab === item.value ? 'text-default' : 'text-muted'" />
					</template>
				</UTabs>
			</div>

			<!-- 右侧：搜索/语言 + 操作按钮 -->
			<div
				v-motion="headerActionsMotion"
				class="flex items-center gap-2 shrink-0">
				<!-- 页面操作传送门（例如：视图切换器） -->
				<div
					id="header-actions-portal"
					class="flex items-center gap-2"></div>

				<template v-if="isSettingsPage">
					<UTabs
						:items="localeTabItems"
						:model-value="selectedLocale"
						:content="false"
						color="neutral"
						variant="pill"
						size="sm"
						:ui="localeTabsUi"
						@update:model-value="onLocaleTabChange">
						<template #leading="{ item }">
							<span class="text-sm leading-none">{{ item.flag }}</span>
						</template>
					</UTabs>
				</template>
				<!-- 搜索框（胶囊样式） -->
				<div
					v-else
					class="relative shrink-0">
					<UInput
						v-model="searchQuery"
						:placeholder="t('header.searchPlaceholder')"
						icon="i-lucide-search"
						size="sm"
						:ui="{
							width: 'w-64',
						}"
						class="rounded-full! [&>div]:rounded-full! [&_input]:rounded-full!" />
				</div>

				<!-- Filter/Sort 独立按钮 -->
				<template v-if="isWorkspacePage">
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-filter">
						<span class="ml-1 text-[11px]">{{ t('header.filter') }}</span>
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-arrow-up-down">
						<span class="ml-1 text-[11px]">{{ t('header.sort') }}</span>
					</UButton>

					<template v-if="hasEditBridge">
						<button
							type="button"
							v-motion="editButtonMotion"
							class="ml-1 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold shadow-sm"
							:class="editButtonClass"
							@click="onToggleEditMode">
							<UIcon
								:name="editButtonIcon"
								class="size-3.5"
								:class="editButtonIconClass" />
							<span>{{ editButtonLabel }}</span>
						</button>
					</template>
				</template>
			</div>
		</div>

		<div
			v-if="hasEditBridge && isEditMode"
			v-motion="editStripMotion"
			class="pointer-events-none absolute inset-x-0 top-full -mt-px z-layer-header-edit-strip">
			<div class="pointer-events-auto mt-0">
				<button
					type="button"
					class="inline-flex h-12 w-full items-center justify-center gap-2 bg-linear-to-b from-error/95 to-error/10 px-5 text-sm font-semibold text-white transition-[background,opacity] hover:from-error/95 hover:to-error/55 disabled:cursor-not-allowed disabled:opacity-60"
					:class="deleteGlowClass"
					:disabled="editSelectedCount === 0"
					@click="onOpenDeleteConfirm">
					<UIcon
						name="i-lucide-trash-2"
						class="size-4" />
					<span>{{ t('header.delete') }}</span>
					<span class="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold text-white">
						{{ editSelectedCount }}
					</span>
				</button>
			</div>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed, inject, ref, type ComputedRef } from 'vue'
	import { useI18n } from 'vue-i18n'
	import { useRoute, useRouter } from 'vue-router'

	import { setAppLocale } from '@/i18n'
	import { DEFAULT_LOCALE, normalizeAppLocale, type AppLocale } from '@/i18n/messages'
	import { useProjectMotionPreset } from '@/composables/base/motion'
	import { useSettingsNav } from '@/pages/Settings/composables/useSettingsNav'
	import { getPageNavByPath } from '@/config/page-nav'
	import type { ProjectDto } from '@/services/api/projects'
	import { PROJECT_ICON, PROJECT_LEVEL_PILL_CLASSES } from '@/config/project'
	import { DEFAULT_SPACE_DISPLAY, SPACE_DISPLAY, SPACE_IDS } from '@/config/space'
	import { useProjectsStore } from '@/stores/projects'
	import { useSettingsStore } from '@/stores/settings'
	import { useWorkspaceEditStore } from '@/stores/workspace-edit'

	const route = useRoute()
	const router = useRouter()
	const { t, locale } = useI18n({ useScope: 'global' })
	const settingsStore = useSettingsStore()
	const projectsStore = useProjectsStore()
	const workspaceEditStore = useWorkspaceEditStore()
	const { navItems: settingsNavItems, isActive: isSettingsNavActive } = useSettingsNav()
	const toast = useToast()

	const searchQuery = ref('')
	const projectIcon = PROJECT_ICON
	const headerShellMotion = useProjectMotionPreset('drawerSection', 'headerShell')
	const headerBreadcrumbMotion = useProjectMotionPreset('drawerSection', 'headerBreadcrumb')
	const headerActionsMotion = useProjectMotionPreset('drawerSection', 'headerActions')
	const editButtonMotion = useProjectMotionPreset('statusFeedback', 'stateAction')
	const editStripMotion = useProjectMotionPreset('statusFeedback', 'editStrip')

	const isWorkspacePage = computed(() => {
		return route.path.startsWith('/space/') || route.path === '/all-tasks'
	})
	const isSettingsPage = computed(() => route.path.startsWith('/settings'))

	const localeTabsUi = {
		root: 'w-[148px]',
		list: 'w-full rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default data-[state=active]:text-default',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const settingsTabsUi = {
		root: 'w-fit',
		list: 'rounded-full bg-elevated/70 border border-default/80 p-1 gap-1',
		trigger:
			'rounded-full px-3 py-2 text-xs font-medium hover:data-[state=inactive]:bg-default/40 hover:data-[state=inactive]:text-default data-[state=active]:text-default',
		leadingIcon: 'size-3.5',
		indicator: 'rounded-full shadow-sm bg-default inset-y-1',
	}
	const settingsTabItems = computed(() =>
		settingsNavItems.value.map((item) => ({
			label: item.label,
			value: item.to,
			icon: item.icon,
		})),
	)
	const activeSettingsTab = computed(() => {
		const matched = settingsNavItems.value.find((item) => isSettingsNavActive(item.to))
		return matched?.to ?? '/settings/about'
	})

	const localeTabItems = computed(() => [
		{
			label: t('locale.compactOptions.zh'),
			value: 'zh-CN',
			flag: '🇨🇳',
		},
		{
			label: t('locale.compactOptions.en'),
			value: 'en-US',
			flag: '🇺🇸',
		},
	])

	const selectedLocale = computed<AppLocale>(() => {
		return normalizeAppLocale(settingsStore.settings.locale) ?? normalizeAppLocale(locale.value) ?? DEFAULT_LOCALE
	})

	async function onLocaleTabChange(value: string | number) {
		if (typeof value !== 'string') return
		const nextLocale = normalizeAppLocale(value)
		if (!nextLocale) return
		let changed = false

		if (normalizeAppLocale(locale.value) !== nextLocale) {
			setAppLocale(nextLocale)
			changed = true
		}

		if (settingsStore.settings.locale !== nextLocale) {
			await settingsStore.update({ locale: nextLocale })
			changed = true
		}

		if (changed) {
			toast.add({
				title: t('locale.trayRestartNotice'),
				color: 'neutral',
			})
		}
	}
	function onSettingsTabChange(value: string | number) {
		if (typeof value !== 'string') return
		if (route.path === value) return
		void router.push(value)
	}

	const hasEditBridge = computed(() => isWorkspacePage.value && workspaceEditStore.hasHandlers)
	const isEditMode = computed(() => workspaceEditStore.isEditMode)
	const editSelectedCount = computed(() => workspaceEditStore.selectedCount)
	const editButtonLabel = computed(() => (isEditMode.value ? t('header.cancelEdit') : t('header.edit')))
	const editButtonIcon = computed(() => (isEditMode.value ? 'i-lucide-x' : 'i-lucide-pencil'))
	const editButtonClass = computed(() => {
		if (isEditMode.value) {
			return 'bg-zinc-200 text-default hover:bg-zinc-300'
		}
		return 'bg-error text-white shadow-error/40 hover:bg-error/90'
	})
	const editButtonIconClass = computed(() => (isEditMode.value ? 'text-default' : 'text-white'))
	const deleteGlowClass = computed(() => 'shadow-[0_18px_36px_-20px_rgba(239,68,68,0.85)]')

	function onEnterEditMode() {
		workspaceEditStore.triggerEnterEditMode()
	}

	function onExitEditMode() {
		workspaceEditStore.triggerExitEditMode()
	}

	function onOpenDeleteConfirm() {
		workspaceEditStore.triggerOpenDeleteConfirm()
	}

	function onToggleEditMode() {
		if (isEditMode.value) {
			onExitEditMode()
			return
		}
		onEnterEditMode()
	}

	function resolveMetaText(meta: Record<string, unknown> | undefined, field: 'title' | 'description') {
		const keyField = field === 'title' ? 'titleKey' : 'descriptionKey'
		const fromKey = meta?.[keyField]
		if (typeof fromKey === 'string') return t(fromKey)
		const direct = meta?.[field]
		return typeof direct === 'string' ? direct : null
	}

	function isKnownSpaceDisplayKey(value: string): value is keyof typeof SPACE_DISPLAY {
		return value in SPACE_DISPLAY
	}

	const currentSpaceId = computed(() => {
		const sid = route.params.spaceId
		if (typeof sid === 'string') return sid
		return settingsStore.settings.activeSpaceId ?? 'work'
	})

	const currentSpaceLabel = computed(() => {
		const spaceId = currentSpaceId.value
		if (!spaceId) return null
		if (isKnownSpaceDisplayKey(spaceId)) return t(`spaces.${spaceId}`)
		return t('spaces.unknown')
	})

	const currentSpaceIcon = computed(() => {
		const spaceId = currentSpaceId.value
		if (!spaceId) return null
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.icon ?? DEFAULT_SPACE_DISPLAY.icon
	})

	const spacePillClass = computed(() => {
		const spaceId = currentSpaceId.value
		return SPACE_DISPLAY[spaceId as keyof typeof SPACE_DISPLAY]?.pillClass ?? DEFAULT_SPACE_DISPLAY.pillClass
	})
	const showSpaceAsLeadingPill = computed(() => {
		return route.path.startsWith('/space/') || route.path === '/all-tasks' || route.path === '/trash'
	})
	const showSettingsAsLeadingPill = computed(() => route.path.startsWith('/settings'))

	const routeMetaPill = computed(() => {
		if (showSpaceAsLeadingPill.value) return null
		if (showSettingsAsLeadingPill.value) {
			const settingsRecord = route.matched.find((item) => item.path === '/settings')
			const title = resolveMetaText(settingsRecord?.meta as Record<string, unknown> | undefined, 'title')
			const icon = settingsRecord?.meta?.icon
			if (typeof title === 'string' && typeof icon === 'string') {
				return {
					label: title,
					icon,
					pillClass:
						typeof settingsRecord?.meta?.pillClass === 'string' ? settingsRecord.meta.pillClass : 'bg-gray-500',
					to: undefined as string | undefined,
				}
			}
		}
		const routeConfig = getPageNavByPath(route.path)
		if (routeConfig) {
			return {
				label: t(routeConfig.titleKey),
				icon: routeConfig.icon,
				pillClass: routeConfig.pillClass,
				to: undefined as string | undefined,
			}
		}
		const record = [...route.matched].reverse().find((item) => {
			const text = resolveMetaText(item.meta as Record<string, unknown> | undefined, 'title')
			return typeof text === 'string'
		})
		const title = resolveMetaText(record?.meta as Record<string, unknown> | undefined, 'title')
		const icon = record?.meta?.icon
		if (typeof title !== 'string' || typeof icon !== 'string') return null
		return {
			label: title,
			icon,
			pillClass: typeof record?.meta?.pillClass === 'string' ? record.meta.pillClass : 'bg-slate-500',
			to: undefined as string | undefined,
		}
	})

	const leadingPill = computed(() => {
		if (showSpaceAsLeadingPill.value && currentSpaceLabel.value && currentSpaceIcon.value && currentSpaceId.value) {
			return {
				label: currentSpaceLabel.value,
				icon: currentSpaceIcon.value,
				pillClass: spacePillClass.value,
				to: `/space/${currentSpaceId.value}`,
			}
		}
		return routeMetaPill.value
	})

	// 从 inject 获取 workspace 页面的 breadcrumbItems
	const workspaceBreadcrumbItems = inject<
		ComputedRef<{ label: string; to?: string; icon?: string; description?: string }[]>
	>(
		'workspaceBreadcrumbItems',
		computed(() => []),
	)

	const breadcrumbItems = computed(() => {
		// 优先使用 inject 的 breadcrumbItems（来自 workspace 页面），但需要过滤掉 Space 相关的项
		if (workspaceBreadcrumbItems.value.length > 0) {
			const staticSpaceLabels = Object.values(SPACE_DISPLAY).map((item) => item.label.toLowerCase())
			const i18nSpaceLabels = SPACE_IDS.map((id) => t(`spaces.${id}`).toLowerCase())
			const spaceLabelSet = new Set([...staticSpaceLabels, ...i18nSpaceLabels, t('routes.space.title').toLowerCase()])
			// 过滤掉 'Space' 和 space label（如 'Work'），只保留 project 路径
			return workspaceBreadcrumbItems.value.filter((item) => {
				const label = item.label.toLowerCase()
				return label !== 'space' && !spaceLabelSet.has(label)
			})
		}
		if (route.path === '/trash') {
			return [{ label: t('nav.pages.trash.title') }]
		}
		if (route.path.startsWith('/settings')) {
			return []
		}
		// 如果没有传入，根据路由自动生成（只包含 project，不包含 space）
		if (route.path.startsWith('/space/') || route.path === '/all-tasks') {
			const spaceId = (route.params.spaceId as string) || currentSpaceId.value
			const base: { label: string; to?: string; icon?: string; description?: string }[] = []
			const pid = route.query.project
			if (typeof pid === 'string' && spaceId) {
				const list = projectsStore.getProjectsOfSpace(spaceId)
				const path = projectPath(list, pid)
				if (path.length) {
					for (let i = 0; i < path.length; i++) {
						const p = path[i]
						const isLast = i === path.length - 1
						base.push({ label: p.title, ...(isLast ? {} : { to: `/space/${spaceId}?project=${p.id}` }) })
					}
					return base
				}
			}
			base.push({ label: t('nav.pages.allTasks.title') })
			return base
		}
		return []
	})

	const projectTrail = computed(() => breadcrumbItems.value)

	const levelPalette = PROJECT_LEVEL_PILL_CLASSES

	const projectPillClass = (index: number) => levelPalette[index % levelPalette.length]

	/** 从 project 列表按 parentId 回溯，得到 root → … → current 的层级路径 */
	function projectPath(list: ProjectDto[], targetId: string): ProjectDto[] {
		const byId = new Map(list.map((p) => [p.id, p]))
		const out: ProjectDto[] = []
		let curr: ProjectDto | undefined = byId.get(targetId)
		while (curr) {
			out.unshift(curr)
			curr = curr.parentId ? byId.get(curr.parentId) : undefined
		}
		return out
	}
</script>
