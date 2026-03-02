<template>
	<div class="space-y-4">
		<UFormField
			:label="t('modals.createProject.fields.title')"
			required>
			<UInput
				v-model="form.title"
				:placeholder="t('modals.createProject.placeholders.title')"
				size="md"
				class="w-full"
				:ui="{
					rounded: 'rounded-xl',
				}"
				autofocus
				@keydown.meta.enter.prevent="emit('submit')"
				@keydown.ctrl.enter.prevent="emit('submit')" />
		</UFormField>

		<div class="grid grid-cols-2 gap-4">
			<UFormField :label="t('modals.createProject.fields.space')">
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
						<div
							v-if="isSelectOption(item)"
							class="flex items-center gap-2 py-0.5">
							<UIcon
								:name="item.icon"
								class="size-4 shrink-0"
								:class="item.iconClass" />
							<span class="truncate">{{ item.label }}</span>
						</div>
					</template>
				</USelectMenu>
			</UFormField>

			<UFormField :label="t('modals.createProject.fields.parentProject')">
				<USelectMenu
					v-model="form.parentId"
					:items="parentOptions"
					value-key="value"
					label-key="label"
					size="md"
					class="w-full"
					:placeholder="projectRootLabel"
					:search-input="false"
					:ui="selectMenuUi">
					<template #item="{ item }">
						<div
							v-if="isSelectOption(item)"
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
			<UFormField :label="t('modals.createProject.fields.priority')">
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
						<div
							v-if="isSelectOption(item)"
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
		</div>

		<UFormField :label="t('modals.createProject.fields.tags')">
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
					:placeholder="t('modals.createProject.placeholders.tag')"
					size="md"
					class="w-full"
					:ui="{
						rounded: 'rounded-xl',
					}"
					@keydown.enter.prevent="emit('add-tag')" />
			</div>
		</UFormField>

		<UFormField :label="t('modals.createProject.fields.links')">
			<div class="space-y-2">
				<div
					v-if="form.links.length === 0"
					class="text-xs text-muted">
					{{ t('modals.createProject.empty.links') }}
				</div>
				<div
					v-for="(link, index) in form.links"
					:key="`project-link-${index}`"
					class="rounded-xl border border-default p-3 space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<UInput
							v-model="link.title"
							:placeholder="t('modals.createProject.placeholders.linkTitle')"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
						<UInput
							v-model="link.url"
							:placeholder="t('modals.createProject.placeholders.linkUrl')"
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
							:ui="linkSelectMenuUi" />
						<UButton
							color="neutral"
							variant="soft"
							size="sm"
							class="justify-center"
							@click="emit('remove-link', index)">
							{{ t('modals.createProject.buttons.remove') }}
						</UButton>
					</div>
				</div>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-plus"
					@click="emit('add-link')">
					{{ t('modals.createProject.buttons.addLink') }}
				</UButton>
			</div>
		</UFormField>

		<UFormField :label="t('modals.createProject.fields.note')">
			<UTextarea
				v-model="form.note"
				:placeholder="t('modals.createProject.placeholders.note')"
				:rows="3"
				class="w-full"
				:ui="{
					rounded: 'rounded-xl',
				}" />
		</UFormField>
	</div>
</template>

<script setup lang="ts">
	// 复用边界约束：该组件只负责字段渲染与事件分发，业务流程统一留在 composable。
	import { useI18n } from 'vue-i18n'
	import type {
		CreateProjectFormState,
		LinkKindOption,
		ParentProjectOption,
		PriorityOption,
		SelectOption,
		SpaceOption,
	} from '../composables/useCreateProjectModal'

	const form = defineModel<CreateProjectFormState>('form', { required: true })
	const tagInput = defineModel<string>('tagInput', { required: true })
	const { t } = useI18n({ useScope: 'global' })

	defineProps<{
		spaceOptions: SpaceOption[]
		parentOptions: ParentProjectOption[]
		priorityOptions: PriorityOption[]
		linkKindOptions: LinkKindOption[]
		projectRootLabel: string
	}>()

	const emit = defineEmits<{
		submit: []
		'add-tag': []
		'remove-tag': [tag: string]
		'add-link': []
		'remove-link': [index: number]
	}>()

	const selectMenuUi = {
		rounded: 'rounded-xl',
		width: 'w-full',
		content: 'z-layer-modal-popover',
	}

	const linkSelectMenuUi = {
		rounded: 'rounded-lg',
		width: 'w-full',
		content: 'z-layer-modal-popover',
	}

	function isSelectOption(item: unknown): item is SelectOption {
		return !!item && typeof item === 'object' && 'icon' in item && 'label' in item
	}
</script>
