<template>
	<section
		v-if="customFieldDraftVisible || customFieldsModel.length > 0"
		class="space-y-2">
		<div
			v-if="customFieldsModel.length > 0"
			class="grid grid-cols-2 gap-3">
			<UPopover
				v-for="(field, index) in customFieldsModel"
				:key="`${field.rank}-${index}`"
				:mode="'click'"
				:open="editingIndex === index"
				:popper="{ strategy: 'fixed', placement: 'bottom-start' }"
				:ui="drawerPopoverUi"
				@update:open="(open) => onEditOpenChange(index, open)">
				<div
					v-motion="optionCardHoverMotion"
					class="p-4 rounded-2xl border transition-colors text-left w-full bg-elevated/50 border-default/60 cursor-pointer hover:bg-elevated/80">
					<div class="flex items-center justify-between gap-2">
						<div class="min-w-0 flex flex-1 items-center gap-2.5">
							<UIcon
								name="i-lucide-list-plus"
								class="size-4 shrink-0 text-muted" />
							<div class="min-w-0 flex-1">
								<div class="text-[11px] text-muted mb-1 truncate">{{ field.title }}</div>
								<div class="text-xs font-semibold text-default wrap-break-words">
									{{ field.value || t('inspector.customFields.emptyValue') }}
								</div>
							</div>
						</div>
						<UButton
							color="neutral"
							variant="ghost"
							size="xs"
							icon="i-lucide-trash-2"
							@click.stop="onRemoveCustomField(index)" />
					</div>
				</div>

				<template #content>
					<div class="p-3 min-w-[320px] space-y-2">
						<UInput
							v-model="customFieldsModel[index].title"
							:placeholder="t('inspector.customFields.placeholders.title')"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }"
							@focus="onCustomFieldEditStart"
							@compositionstart="onCustomFieldCompositionStart"
							@compositionend="onCustomFieldCompositionEnd"
							@input="onCustomFieldInput(index)" />
						<div class="space-y-1">
							<UInput
								v-model="customFieldsModel[index].value"
								:placeholder="t('inspector.customFields.placeholders.valueOptional')"
								size="sm"
								class="w-full"
								:ui="{ rounded: 'rounded-lg' }"
								@focus="onCustomFieldEditStart"
								@compositionstart="onCustomFieldCompositionStart"
								@compositionend="onCustomFieldCompositionEnd"
								@input="onCustomFieldInput(index)" />
							<div
								v-if="editingErrorIndex === index"
								class="text-[11px] text-red-500">
								{{ t('inspector.customFields.validation.titleRequired') }}
							</div>
						</div>
					</div>
				</template>
			</UPopover>
		</div>

		<div
			v-if="customFieldDraftVisible"
			class="p-4 rounded-2xl border transition-colors text-left w-full bg-elevated/50 border-default/60 space-y-2">
			<div class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
				<UIcon
					name="i-lucide-list-plus"
					class="size-3.5 shrink-0" />
				{{ t('inspector.customFields.newField') }}
			</div>
			<div class="grid grid-cols-[1fr_auto] gap-2">
				<UInput
					v-model="customFieldDraftTitle"
					:placeholder="t('inspector.customFields.placeholders.title')"
					size="sm"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }"
					@input="onDraftTitleInput" />
				<div class="flex items-center gap-2">
					<UButton
						color="primary"
						variant="solid"
						size="sm"
						class="justify-center"
						@click="onConfirmClick">
						{{ t('common.actions.confirm') }}
					</UButton>
					<UButton
						color="neutral"
						variant="ghost"
						size="sm"
						class="justify-center"
						@click="onCancelClick">
						{{ t('common.actions.cancel') }}
					</UButton>
				</div>
			</div>
			<div class="space-y-1">
				<UInput
					v-model="customFieldDraftValue"
					:placeholder="t('inspector.customFields.placeholders.valueOptional')"
					size="sm"
					class="w-full"
					:ui="{ rounded: 'rounded-lg' }" />
				<div
					v-if="showTitleError"
					class="text-[11px] text-red-500">
					{{ t('inspector.customFields.validation.titleRequired') }}
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { useDrawerEditableListController } from '@/components/InspectorDrawer/shared/composables'
	import { useCardHoverMotionPreset } from '@/composables/base/motion'
	import { createDrawerPopoverLayerUi } from '@/config/ui-layer'
	import type { TaskCustomFieldFormItem } from '../composables/taskFieldNormalization'

	const customFieldsModel = defineModel<TaskCustomFieldFormItem[]>('customFields', { required: true })
	const customFieldDraftTitle = defineModel<string>('draftTitle', { required: true })
	const customFieldDraftValue = defineModel<string>('draftValue', { required: true })
	const customFieldDraftVisible = defineModel<boolean>('draftVisible', { required: true })

	type TextInteractionHandlers = {
		onEditStart: () => void
		onEditEnd: () => void
		onCompositionStart: () => void
		onCompositionEnd: () => void
	}

	type Props = {
		editingErrorIndex: number | null
		onConfirmCustomField: () => boolean
		onRemoveCustomField: (index: number) => void
		onCustomFieldInput: (index: number) => void
		onFlushCustomFieldEdits: () => void
		interaction: TextInteractionHandlers
	}

	const props = defineProps<Props>()
	const { t } = useI18n({ useScope: 'global' })
	const drawerPopoverUi = createDrawerPopoverLayerUi()
	const optionCardHoverMotion = useCardHoverMotionPreset()
	const {
		editingIndex,
		draftErrorVisible: showTitleError,
		onDraftInput,
		setDraftConfirmResult,
		resetDraftError,
		onEditOpenChange,
	} = useDrawerEditableListController({
		interaction: props.interaction,
		onItemInput: (index) => {
			props.onCustomFieldInput(index)
		},
		onFlushEdits: () => {
			props.onFlushCustomFieldEdits()
		},
	})

	function onDraftTitleInput() {
		onDraftInput(customFieldDraftTitle.value)
	}

	function onConfirmClick() {
		setDraftConfirmResult(props.onConfirmCustomField())
	}

	function onCancelClick() {
		customFieldDraftTitle.value = ''
		customFieldDraftValue.value = ''
		customFieldDraftVisible.value = false
		resetDraftError()
	}

	function onCustomFieldInput(index: number) {
		props.onCustomFieldInput(index)
	}

	function onCustomFieldEditStart() {
		props.interaction.onEditStart()
	}

	function onCustomFieldCompositionStart() {
		props.interaction.onCompositionStart()
	}

	function onCustomFieldCompositionEnd() {
		props.interaction.onCompositionEnd()
	}
</script>
