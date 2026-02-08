<template>
	<section class="space-y-2">
		<div class="flex items-center justify-between">
			<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">关联链接</label>
			<UButton
				color="neutral"
				variant="soft"
				size="xs"
				icon="i-lucide-plus"
				@click="onAddLink">
				新增
			</UButton>
		</div>

		<div
			v-if="linksModel.length === 0"
			class="rounded-xl border border-dashed border-default/70 px-3 py-2 text-xs text-muted">
			暂无链接
		</div>

		<div
			v-for="(link, index) in linksModel"
			:key="link.id ?? `draft-${index}`"
			class="rounded-xl border border-default p-3 space-y-2 bg-elevated/30">
			<div class="grid grid-cols-2 gap-2">
				<UInput
					v-model="link.title"
					placeholder="标题（可选）"
					size="sm"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }"
					@input="onLinksInput"
					@blur="onLinksBlur" />
				<UInput
					v-model="link.url"
					placeholder="URL（必填）"
					size="sm"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }"
					@input="onLinksInput"
					@blur="onLinksBlur" />
			</div>
			<div class="grid grid-cols-2 gap-2">
				<USelectMenu
					v-model="link.kind"
					:items="linkKindOptions"
					value-key="value"
					label-key="label"
					size="sm"
					class="w-full"
					:search-input="false"
					:ui="compactSelectMenuUi"
					@update:model-value="onLinksInput"
					@blur="onLinksBlur" />
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					class="justify-center"
					@click="onRemoveLink(index)">
					移除
				</UButton>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import type { LinkKindOption } from '../composables/useTaskInspectorOptions'
	import type { TaskLinkFormItem } from '../composables/taskFieldNormalization'

	const linksModel = defineModel<TaskLinkFormItem[]>('links', { required: true })

	type Props = {
		linkKindOptions: LinkKindOption[]
		onAddLink: () => void
		onRemoveLink: (index: number) => void
		onLinksInput: () => void
		onLinksBlur: () => void
	}

	defineProps<Props>()

	const compactSelectMenuUi = {
		rounded: 'rounded-lg',
		width: 'w-full',
		content: 'z-layer-drawer-popover',
	}
</script>
