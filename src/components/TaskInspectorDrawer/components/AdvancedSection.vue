<template>
	<section class="space-y-2">
		<button
			type="button"
			class="flex items-center justify-between w-full"
			@click="onToggleAdvanced">
			<div class="flex items-center gap-2">
				<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">高级属性</label>
				<UBadge
					size="xs"
					color="neutral"
					variant="soft">
					{{ customFieldsModel.length }}
				</UBadge>
			</div>
			<UIcon
				name="i-lucide-chevron-down"
				class="size-4 text-muted transition-transform duration-200"
				:class="advancedCollapsed ? '' : 'rotate-180'" />
		</button>

		<div
			v-show="!advancedCollapsed"
			class="rounded-xl border border-default p-3 space-y-2 bg-elevated/20">
			<div class="flex items-center justify-end">
				<UButton
					color="neutral"
					variant="soft"
					size="xs"
					icon="i-lucide-plus"
					@click="onAddCustomField">
					新增字段
				</UButton>
			</div>

			<div
				v-if="customFieldsModel.length === 0"
				class="text-xs text-muted px-1 py-1">
				暂无自定义字段
			</div>

			<div
				v-for="(field, index) in customFieldsModel"
				:key="`${field.key}-${index}`"
				class="rounded-lg border border-default p-2 space-y-2 bg-default/70">
				<div class="grid grid-cols-3 gap-2">
					<UInput
						v-model="field.key"
						placeholder="Key"
						size="sm"
						class="w-full"
						:ui="{ rounded: 'rounded-lg' }"
						@input="onCustomFieldsInput"
						@blur="onCustomFieldsBlur" />
					<UInput
						v-model="field.label"
						placeholder="Label"
						size="sm"
						class="w-full"
						:ui="{ rounded: 'rounded-lg' }"
						@input="onCustomFieldsInput"
						@blur="onCustomFieldsBlur" />
					<UInput
						v-model="field.value"
						placeholder="Value（可选）"
						size="sm"
						class="w-full"
						:ui="{ rounded: 'rounded-lg' }"
						@input="onCustomFieldsInput"
						@blur="onCustomFieldsBlur" />
				</div>
				<div class="flex justify-end">
					<UButton
						color="neutral"
						variant="soft"
						size="xs"
						@click="onRemoveCustomField(index)">
						移除字段
					</UButton>
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import type { TaskCustomFieldFormItem } from '../composables/taskFieldNormalization'

	const customFieldsModel = defineModel<TaskCustomFieldFormItem[]>('customFields', { required: true })

	type Props = {
		advancedCollapsed: boolean
		onToggleAdvanced: () => void
		onAddCustomField: () => void
		onRemoveCustomField: (index: number) => void
		onCustomFieldsInput: () => void
		onCustomFieldsBlur: () => void
	}

	defineProps<Props>()
</script>
