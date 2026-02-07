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

		<div class="grid grid-cols-1 gap-4">
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

		<UFormField label="Tags (可选)">
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
					placeholder="输入标签后按回车添加"
					size="md"
					class="w-full"
					:ui="{
						rounded: 'rounded-xl',
					}"
					@keydown.enter.prevent="emit('add-tag')" />
			</div>
		</UFormField>

		<UFormField label="Links (可选)">
			<div class="space-y-2">
				<div
					v-if="form.links.length === 0"
					class="text-xs text-muted">
					暂无链接
				</div>
				<div
					v-for="(link, index) in form.links"
					:key="`project-link-${index}`"
					class="rounded-xl border border-default p-3 space-y-2">
					<div class="grid grid-cols-2 gap-2">
						<UInput
							v-model="link.title"
							placeholder="标题（可选）"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
						<UInput
							v-model="link.url"
							placeholder="URL（必填）"
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
							:ui="{ rounded: 'rounded-lg', width: 'w-full' }" />
						<UButton
							color="neutral"
							variant="soft"
							size="sm"
							class="justify-center"
							@click="emit('remove-link', index)">
							移除
						</UButton>
					</div>
				</div>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-plus"
					@click="emit('add-link')">
					新增链接
				</UButton>
			</div>
		</UFormField>

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
		LinkKindOption,
		ParentProjectOption,
		PriorityOption,
		SelectOption,
		SpaceOption,
	} from '../composables/useCreateProjectModal'

	const form = defineModel<CreateProjectFormState>('form', { required: true })
	const tagInput = defineModel<string>('tagInput', { required: true })

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
	}

	function isSelectOption(item: unknown): item is SelectOption {
		return !!item && typeof item === 'object' && 'icon' in item && 'label' in item
	}
</script>
