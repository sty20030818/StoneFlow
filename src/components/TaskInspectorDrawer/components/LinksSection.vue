<template>
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">关联链接</label>
			<button
				type="button"
				class="inline-flex h-6 w-6 items-center justify-center rounded-full border border-default/60 bg-elevated/60 text-sm font-semibold text-muted transition-colors hover:bg-elevated"
				aria-label="新增链接"
				@click="onAddLinkDraft">
				+
			</button>
		</div>

		<div
			v-if="linksModel.length === 0 && !draftVisible"
			class="rounded-xl border border-dashed border-default/70 px-3 py-2 text-xs text-muted">
			暂无链接
		</div>

		<div class="space-y-2">
			<UPopover
				v-for="(link, index) in linksModel"
				:key="link.id ?? `confirmed-${index}`"
				:mode="'click'"
				:open="editingIndex === index"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi"
				@update:open="(open) => onEditOpenChange(index, open)">
				<div class="rounded-xl border border-default p-3 space-y-2 bg-elevated/30 cursor-pointer transition-colors hover:bg-elevated/50">
					<div class="flex items-start justify-between gap-2">
						<div class="min-w-0 flex items-center gap-2">
							<div class="truncate text-sm font-medium text-default">
								{{ link.title.trim() || '未命名链接' }}
							</div>
							<UBadge
								size="xs"
								color="neutral"
								variant="soft">
								{{ getKindLabel(link.kind) }}
							</UBadge>
						</div>
						<UButton
							color="neutral"
							variant="ghost"
							size="xs"
							icon="i-lucide-trash-2"
							@click.stop="onRemoveLink(index)" />
					</div>
					<div class="break-all text-xs text-muted">
						{{ link.url }}
					</div>
				</div>

				<template #content>
					<div class="p-3 min-w-[360px] space-y-2">
						<div class="grid grid-cols-[1fr_auto] gap-2">
							<UInput
								v-model="linksModel[index].title"
								placeholder="标题（可选）"
								size="sm"
								class="w-full"
								:ui="{ rounded: 'rounded-lg' }"
								@input="onLinkInput(index)" />
							<USelectMenu
								v-model="linksModel[index].kind"
								:items="linkKindOptions"
								value-key="value"
								label-key="label"
								size="sm"
								class="w-36"
								:search-input="false"
								:ui="compactSelectMenuUi"
								@update:model-value="onLinkInput(index)" />
						</div>
						<div class="space-y-1">
							<UInput
								v-model="linksModel[index].url"
								placeholder="URL"
								size="sm"
								class="w-full"
								:ui="{ rounded: 'rounded-lg' }"
								@input="onLinkInput(index)" />
							<div
								v-if="editingErrorIndex === index"
								class="text-[11px] text-red-500">
								URL 不能为空
							</div>
						</div>
					</div>
				</template>
			</UPopover>
		</div>

		<div
			v-if="draftVisible"
			class="rounded-xl border border-default p-3 space-y-2 bg-elevated/20">
			<div class="grid grid-cols-[1fr_auto_auto_auto] gap-2">
				<UInput
					v-model="draftTitle"
					placeholder="标题（可选）"
					size="sm"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }" />
				<USelectMenu
					v-model="draftKind"
					:items="linkKindOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="w-36"
					:search-input="false"
					:ui="compactSelectMenuUi" />
				<UButton
					color="primary"
					variant="solid"
					size="sm"
					class="justify-center"
					@click="onConfirmClick">
					确认
				</UButton>
				<UButton
					color="neutral"
					variant="ghost"
					size="sm"
					class="justify-center"
					@click="onCancelClick">
					取消
				</UButton>
			</div>
			<div class="space-y-1">
				<UInput
					v-model="draftUrl"
					placeholder="URL"
					size="sm"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }"
					@input="onDraftUrlInput" />
				<div
					v-if="showDraftUrlError"
					class="text-[11px] text-red-500">
					URL 不能为空
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed, ref } from 'vue'

	import { createDrawerPopoverLayerUi } from '@/config/ui-layer'
	import type { LinkKindOption } from '../composables/useTaskInspectorOptions'
	import type { TaskLinkFormItem } from '../composables/taskFieldNormalization'

	const linksModel = defineModel<TaskLinkFormItem[]>('links', { required: true })
	const draftTitle = defineModel<string>('draftTitle', { required: true })
	const draftKind = defineModel<TaskLinkFormItem['kind']>('draftKind', { required: true })
	const draftUrl = defineModel<string>('draftUrl', { required: true })
	const draftVisible = defineModel<boolean>('draftVisible', { required: true })

	type Props = {
		linkKindOptions: LinkKindOption[]
		editingErrorIndex: number | null
		onAddLinkDraft: () => void
		onConfirmLink: () => boolean
		onRemoveLink: (index: number) => void
		onLinkInput: (index: number) => void
		onFlushLinkEdits: () => void
	}

	const props = defineProps<Props>()
	const showDraftUrlError = ref(false)
	const editingIndex = ref<number | null>(null)
	const drawerPopoverUi = createDrawerPopoverLayerUi()

	const kindLabelMap = computed(() => {
		return new Map(props.linkKindOptions.map((item) => [item.value, item.label]))
	})

	function getKindLabel(kind: TaskLinkFormItem['kind']): string {
		return kindLabelMap.value.get(kind) ?? kind
	}

	function onDraftUrlInput() {
		if (showDraftUrlError.value && draftUrl.value.trim()) {
			showDraftUrlError.value = false
		}
	}

	function onAddLinkDraft() {
		props.onAddLinkDraft()
		showDraftUrlError.value = false
	}

	function onConfirmClick() {
		const ok = props.onConfirmLink()
		showDraftUrlError.value = !ok
	}

	function onCancelClick() {
		draftTitle.value = ''
		draftUrl.value = ''
		draftKind.value = 'web'
		draftVisible.value = false
		showDraftUrlError.value = false
	}

	function onEditOpenChange(index: number, open: boolean) {
		if (open) {
			editingIndex.value = index
			props.onLinkInput(index)
			return
		}
		if (editingIndex.value === index) {
			editingIndex.value = null
		}
		props.onFlushLinkEdits()
	}

	function onLinkInput(index: number) {
		props.onLinkInput(index)
	}

	const compactSelectMenuUi = {
		rounded: 'rounded-lg',
		width: 'w-full',
		content: 'z-layer-drawer-popover',
	}
</script>
