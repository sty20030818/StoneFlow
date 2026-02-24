<template>
	<div class="space-y-4">
		<UFormField
			:label="t('modals.createTask.fields.title')"
			required>
			<UInput
				v-model="form.title"
				:placeholder="t('modals.createTask.placeholders.title')"
				size="md"
				class="w-full"
				:ui="{
					rounded: 'rounded-xl',
				}"
				autofocus
				@keydown.meta.enter.prevent="emit('submit')"
				@keydown.ctrl.enter.prevent="emit('submit')" />
		</UFormField>

		<div class="grid grid-cols-1 gap-4">
			<UFormField :label="t('modals.createTask.fields.space')">
				<USelectMenu
					v-model="form.spaceId"
					:items="spaceOptions"
					value-key="value"
					label-key="label"
					size="md"
					class="w-full"
					:search-input="false"
					:ui="selectMenuUi">
					<template #item="{ item }">
						<div class="flex items-center gap-2 py-0.5">
							<UIcon
								:name="item.icon"
								class="size-4 shrink-0"
								:class="item.iconClass" />
							<span class="truncate">{{ item.label }}</span>
						</div>
					</template>
				</USelectMenu>
			</UFormField>

			<UFormField :label="t('modals.createTask.fields.project')">
				<USelectMenu
					v-model="form.projectId"
					:items="projectOptions"
					value-key="value"
					label-key="label"
					size="md"
					class="w-full"
					:placeholder="uncategorizedLabel"
					:search-input="false"
					:ui="selectMenuUi">
					<template #item="{ item }">
						<div
							class="flex items-center gap-2 py-1"
							:style="{ paddingLeft: `${(item.depth ?? 0) * 16}px` }">
							<UIcon
								:name="item.icon"
								class="size-4 shrink-0"
								:class="item.iconClass" />
							<span class="truncate">{{ item.label }}</span>
						</div>
					</template>
				</USelectMenu>
			</UFormField>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<UFormField :label="t('modals.createTask.fields.status')">
				<USelectMenu
					v-model="form.status"
					:items="statusOptions"
					value-key="value"
					label-key="label"
					size="md"
					class="w-full"
					:search-input="false"
					:ui="selectMenuUi">
					<template #item="{ item }">
						<div
							v-if="item"
							class="flex items-center gap-2 py-0.5">
							<UIcon
								:name="item.icon"
								class="size-4 shrink-0"
								:class="item.iconClass" />
							<span>{{ item.label }}</span>
						</div>
					</template>
				</USelectMenu>
			</UFormField>

			<UFormField :label="t('modals.createTask.fields.priority')">
				<USelectMenu
					v-model="form.priority"
					:items="priorityOptions"
					value-key="value"
					label-key="label"
					size="md"
					class="w-full"
					:search-input="false"
					:ui="selectMenuUi">
					<template #item="{ item }">
						<div class="flex items-center gap-2 py-0.5">
							<UIcon
								:name="item.icon"
								class="size-4 shrink-0"
								:class="item.iconClass" />
							<span>{{ item.label }}</span>
						</div>
					</template>
				</USelectMenu>
			</UFormField>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<UFormField :label="t('modals.createTask.fields.deadline')">
				<DatePickerInput
					v-model="form.deadlineDate"
					size="md"
					class-name="w-full"
					:popover-ui="{ content: 'z-layer-modal-popover' }" />
			</UFormField>
		</div>

		<UFormField
			v-if="form.status === 'done'"
			:label="t('modals.createTask.fields.doneReason')">
			<USelectMenu
				v-model="form.doneReason"
				:items="doneReasonOptions"
				value-key="value"
				label-key="label"
				size="md"
				class="w-full"
				:search-input="false"
				:ui="selectMenuUi">
				<template #item="{ item }">
					<div class="flex items-center gap-2 py-0.5">
						<UIcon
							:name="item.icon"
							class="size-4 shrink-0"
							:class="item.iconClass" />
						<span>{{ item.label }}</span>
					</div>
				</template>
			</USelectMenu>
		</UFormField>

		<UFormField :label="t('modals.createTask.fields.tags')">
			<div class="space-y-2">
				<div class="flex flex-wrap gap-2">
					<UBadge
						v-for="tag in form.tags"
						:key="tag"
						color="neutral"
						variant="soft"
						size="sm"
						class="cursor-pointer"
						@click="emit('remove-tag', tag)">
						#{{ tag }}
						<template #trailing>
							<UIcon
								name="i-lucide-x"
								class="size-3 ml-1" />
						</template>
					</UBadge>
				</div>
				<UInput
					v-model="tagInput"
					:placeholder="t('modals.createTask.placeholders.tag')"
					size="md"
					class="w-full"
					:ui="{
						rounded: 'rounded-xl',
					}"
					@keydown.enter.prevent="emit('add-tag')" />
			</div>
		</UFormField>

		<UFormField :label="t('modals.createTask.fields.links')">
			<div class="space-y-2">
				<div
					v-if="form.links.length === 0"
					class="text-xs text-muted">
					{{ t('modals.createTask.empty.links') }}
				</div>
				<div
					v-for="(link, index) in form.links"
					:key="`task-link-${index}`"
					class="rounded-xl border border-default p-3 space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<UInput
							v-model="link.title"
							:placeholder="t('modals.createTask.placeholders.linkTitle')"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
						<UInput
							v-model="link.url"
							:placeholder="t('modals.createTask.placeholders.linkUrl')"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
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
							:ui="compactSelectMenuUi" />
						<UButton
							color="neutral"
							variant="soft"
							size="sm"
							class="justify-center"
							@click="emit('remove-link', index)">
							{{ t('modals.createTask.buttons.remove') }}
						</UButton>
					</div>
				</div>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-plus"
					@click="emit('add-link')">
					{{ t('modals.createTask.buttons.addLink') }}
				</UButton>
			</div>
		</UFormField>

		<UFormField :label="t('modals.createTask.fields.note')">
			<UTextarea
				v-model="form.note"
				:placeholder="t('modals.createTask.placeholders.note')"
				:rows="3"
				size="md"
				class="w-full"
				autoresize
				:ui="{
					rounded: 'rounded-xl',
				}" />
		</UFormField>

		<div class="rounded-xl border border-default">
			<button
				type="button"
				class="w-full px-3 py-2 text-sm flex items-center justify-between"
				@click="emit('toggle-advanced')">
				<span class="font-medium">{{ t('modals.createTask.fields.advanced') }}</span>
				<UIcon
					:name="advancedOpen ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
					class="size-4" />
			</button>
			<div
				v-if="advancedOpen"
				class="border-t border-default p-3 space-y-2">
				<div
					v-if="form.customFields.length === 0"
					class="text-xs text-muted">
					{{ t('modals.createTask.empty.customFields') }}
				</div>
				<div
					v-for="(field, index) in form.customFields"
					:key="`field-${index}`"
					class="rounded-lg border border-default p-2 space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<UInput
							v-model="field.title"
							:placeholder="t('modals.createTask.placeholders.customFieldTitle')"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
						<UInput
							v-model="field.value"
							:placeholder="t('modals.createTask.placeholders.customFieldValue')"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
					</div>
					<div class="flex justify-end">
						<UButton
							color="neutral"
							variant="soft"
							size="xs"
							@click="emit('remove-custom-field', index)">
							{{ t('modals.createTask.buttons.removeField') }}
						</UButton>
					</div>
				</div>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-plus"
					@click="emit('add-custom-field')">
					{{ t('modals.createTask.buttons.addCustomField') }}
				</UButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	// 复用边界约束：该组件只负责字段渲染与事件分发，业务流程统一留在 composable。
	import { useI18n } from 'vue-i18n'
	import DatePickerInput from '@/components/DatePickerInput.vue'

	import type { DoneReasonOption, PriorityOption, StatusOption } from '@/config/task'
	import type { SpaceId } from '@/config/space'
	import type { CreateTaskFormState, LinkKindOption, ProjectOption } from '../composables/useCreateTaskModal'

	type SpaceOption = {
		value: SpaceId
		label: string
		icon: string
		iconClass: string
	}

	const form = defineModel<CreateTaskFormState>('form', { required: true })
	const tagInput = defineModel<string>('tagInput', { required: true })
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		spaceOptions: SpaceOption[]
		projectOptions: ProjectOption[]
		statusOptions: StatusOption[]
		priorityOptions: PriorityOption[]
		doneReasonOptions: DoneReasonOption[]
		linkKindOptions: LinkKindOption[]
		advancedOpen: boolean
		uncategorizedLabel: string
	}>()

	const emit = defineEmits<{
		submit: []
		'toggle-advanced': []
		'add-tag': []
		'remove-tag': [tag: string]
		'add-link': []
		'remove-link': [index: number]
		'add-custom-field': []
		'remove-custom-field': [index: number]
	}>()

	const selectMenuUi = {
		rounded: 'rounded-xl',
		width: 'w-full',
		content: 'z-layer-modal-popover',
	}

	const compactSelectMenuUi = {
		rounded: 'rounded-lg',
		width: 'w-full',
		content: 'z-layer-modal-popover',
	}
</script>
