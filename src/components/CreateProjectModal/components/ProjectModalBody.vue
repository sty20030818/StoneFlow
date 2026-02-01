<template>
	<div class="space-y-4">
		<UFormField
			label="Project Title"
			required>
			<UInput
				v-model="form.title"
				placeholder="e.g. Q3 Roadmap"
				size="md"
				class="w-full"
				:ui="{
					rounded: 'rounded-xl',
				}"
				autofocus
				@keydown.enter="emit('submit')" />
		</UFormField>

		<div class="grid grid-cols-1 gap-4">
			<UFormField label="Space">
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

			<UFormField label="Parent Project">
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
			<UFormField label="Priority">
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

		<UFormField label="Note">
			<UTextarea
				v-model="form.note"
				placeholder="What is the goal of this project?"
				:rows="3"
				class="w-full"
				:ui="{
					rounded: 'rounded-xl',
				}" />
		</UFormField>
	</div>
</template>

<script setup lang="ts">
	import type {
		CreateProjectFormState,
		ParentProjectOption,
		PriorityOption,
		SelectOption,
		SpaceOption,
	} from '../composables/useCreateProjectModal'

	const form = defineModel<CreateProjectFormState>('form', { required: true })

	defineProps<{
		spaceOptions: SpaceOption[]
		parentOptions: ParentProjectOption[]
		priorityOptions: PriorityOption[]
		projectRootLabel: string
	}>()

	const emit = defineEmits<{
		submit: []
	}>()

	const selectMenuUi = {
		rounded: 'rounded-xl',
		width: 'w-full',
	}

	function isSelectOption(item: unknown): item is SelectOption {
		return !!item && typeof item === 'object' && 'icon' in item && 'label' in item
	}
</script>
