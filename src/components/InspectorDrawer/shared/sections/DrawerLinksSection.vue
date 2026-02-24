<template>
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="text-xs font-semibold text-muted">关联链接</label>
			<UButton
				color="neutral"
				variant="soft"
				size="xs"
				icon="i-lucide-plus"
				@click="onAddLinkDraft">
				新增
			</UButton>
		</div>

		<div
			v-for="(link, index) in linksModel"
			:key="link.id ?? `draft-${index}`"
			class="space-y-2 rounded-xl border border-default p-3 bg-default">
			<div class="flex items-start justify-between gap-2">
				<div class="min-w-0 space-y-1">
					<p class="truncate text-sm font-semibold text-default">
						{{ link.title.trim() || '未命名链接' }}
					</p>
					<UBadge
						size="xs"
						color="neutral"
						variant="soft">
						{{ getKindLabel(link.kind) }}
					</UBadge>
				</div>
				<div class="flex items-center gap-1">
					<UPopover
						:open="editingIndex === index"
						:ui="editPopoverUi"
						@update:open="(open) => onEditOpenChange(index, open)">
						<UButton
							color="neutral"
							variant="ghost"
							size="xs"
							icon="i-lucide-pencil-line" />
						<template #content>
							<UInput
								v-model="linksModel[index].title"
								placeholder="标题（可选）"
								size="xs"
								:ui="{ rounded: 'rounded-lg' }"
								@input="onLinkInput(index)"
								@compositionstart="onLinkCompositionStart"
								@compositionend="onLinkCompositionEnd" />
							<USelectMenu
								v-model="linksModel[index].kind"
								:items="linkKindOptions"
								value-key="value"
								label-key="label"
								size="xs"
								:search-input="false"
								:ui="selectMenuUi"
								@update:model-value="onLinkInput(index)" />
							<UInput
								v-model="linksModel[index].url"
								placeholder="URL（必填）"
								size="xs"
								:ui="{ rounded: 'rounded-lg' }"
								@input="onLinkInput(index)"
								@compositionstart="onLinkCompositionStart"
								@compositionend="onLinkCompositionEnd" />
						</template>
					</UPopover>
					<UButton
						color="neutral"
						variant="ghost"
						size="xs"
						icon="i-lucide-trash-2"
						@click="onRemoveLink(index)" />
				</div>
			</div>
			<a
				class="block truncate text-xs text-primary hover:underline"
				:href="link.url"
				target="_blank"
				rel="noreferrer">
				{{ link.url }}
			</a>
			<p
				v-if="editingErrorIndex === index"
				class="text-[11px] text-error">
				URL 不能为空
			</p>
		</div>

		<div
			v-if="draftVisible"
			class="space-y-2 rounded-xl border border-dashed border-default p-3">
			<div class="grid grid-cols-[1fr_120px_auto_auto] gap-2">
				<UInput
					v-model="draftTitle"
					placeholder="标题（可选）"
					size="xs"
					:ui="{ rounded: 'rounded-lg' }"
					@compositionstart="onLinkCompositionStart"
					@compositionend="onLinkCompositionEnd" />
				<USelectMenu
					v-model="draftKind"
					:items="linkKindOptions"
					value-key="value"
					label-key="label"
					size="xs"
					:search-input="false"
					:ui="selectMenuUi" />
				<UButton
					color="primary"
					size="xs"
					@click="onConfirmClick">
					确认
				</UButton>
				<UButton
					color="neutral"
					variant="soft"
					size="xs"
					@click="onCancelClick">
					取消
				</UButton>
			</div>
			<div class="space-y-1">
				<UInput
					v-model="draftUrl"
					placeholder="URL（必填）"
					size="xs"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }"
					@compositionstart="onLinkCompositionStart"
					@compositionend="onLinkCompositionEnd"
					@input="onDraftUrlInput" />
				<div
					v-if="showDraftUrlError"
					class="text-[11px] text-red-500">
					URL 不能为空
				</div>
			</div>
		</div>
		<p
			v-if="linksModel.length === 0 && !draftVisible"
			class="rounded-xl border border-default/70 bg-elevated/50 px-3 py-2 text-xs text-muted">
			{{ emptyText }}
		</p>
	</section>
</template>

<script setup lang="ts">
	import { DRAWER_LINK_SELECT_MENU_UI, DRAWER_LINKS_EMPTY_TEXT } from '../constants'
	import { useDrawerEditableListController, useDrawerLinkKindLabelMap } from '../composables'
	import type { DrawerEditInteractionHandlers, DrawerLinkFormItem, DrawerLinkKindOption } from '../types'

	const linksModel = defineModel<DrawerLinkFormItem[]>('links', { required: true })
	const draftTitle = defineModel<string>('draftTitle', { required: true })
	const draftKind = defineModel<string>('draftKind', { required: true })
	const draftUrl = defineModel<string>('draftUrl', { required: true })
	const draftVisible = defineModel<boolean>('draftVisible', { required: true })

	type Props = {
		linkKindOptions: DrawerLinkKindOption[]
		editingErrorIndex: number | null
		onAddLinkDraft: () => void
		onConfirmLink: () => boolean
		onRemoveLink: (index: number) => void
		onLinkInput: (index: number) => void
		onFlushLinkEdits: () => void
		interaction: DrawerEditInteractionHandlers
		emptyText?: string
	}

	const props = withDefaults(defineProps<Props>(), {
		emptyText: DRAWER_LINKS_EMPTY_TEXT,
	})

	const kindLabelMap = useDrawerLinkKindLabelMap(() => props.linkKindOptions)
	const {
		editingIndex,
		draftErrorVisible: showDraftUrlError,
		onDraftInput,
		setDraftConfirmResult,
		resetDraftError,
		onEditOpenChange,
	} = useDrawerEditableListController({
		interaction: props.interaction,
		onItemInput: (index) => {
			props.onLinkInput(index)
		},
		onFlushEdits: () => {
			props.onFlushLinkEdits()
		},
	})

	const editPopoverUi = {
		content: 'w-[280px] rounded-xl p-3 space-y-2 z-layer-drawer-popover',
	}

	const selectMenuUi = DRAWER_LINK_SELECT_MENU_UI

	function getKindLabel(kind: string): string {
		return kindLabelMap.value.get(kind) ?? '其他'
	}

	function onDraftUrlInput() {
		onDraftInput(draftUrl.value)
	}

	function onAddLinkDraft() {
		props.onAddLinkDraft()
		resetDraftError()
	}

	function onConfirmClick() {
		setDraftConfirmResult(props.onConfirmLink())
	}

	function onCancelClick() {
		draftTitle.value = ''
		draftUrl.value = ''
		draftKind.value = 'web'
		draftVisible.value = false
		resetDraftError()
	}

	function onLinkInput(index: number) {
		props.onLinkInput(index)
	}

	function onLinkCompositionStart() {
		props.interaction.onCompositionStart()
	}

	function onLinkCompositionEnd() {
		props.interaction.onCompositionEnd()
	}

	function onRemoveLink(index: number) {
		props.onRemoveLink(index)
	}
</script>
