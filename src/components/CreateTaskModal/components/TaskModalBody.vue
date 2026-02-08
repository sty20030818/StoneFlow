<template>
	<div class="space-y-4">
		<UFormField
			label="Title"
			required>
			<UInput
				v-model="form.title"
				placeholder="输入任务标题..."
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

			<UFormField label="Project">
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
			<UFormField label="Status">
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
			<UFormField label="截止时间">
				<UInput
					v-model="form.deadlineDate"
					type="date"
					size="md"
					class="w-full"
					:ui="{
						rounded: 'rounded-xl',
					}"
					placeholder="选择截止日期" />
			</UFormField>
		</div>

		<UFormField
			v-if="form.status === 'done'"
			label="完成类型">
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
					:key="`task-link-${index}`"
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
							:ui="compactSelectMenuUi" />
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

		<UFormField label="Note (可选)">
			<UTextarea
				v-model="form.note"
				placeholder="记录一些背景信息、想法或链接…"
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
				<span class="font-medium">高级属性</span>
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
					暂无自定义字段
				</div>
				<div
					v-for="(field, index) in form.customFields"
					:key="`field-${index}`"
					class="rounded-lg border border-default p-2 space-y-2">
					<div class="grid grid-cols-3 gap-2">
						<UInput
							v-model="field.key"
							placeholder="Key"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
						<UInput
							v-model="field.label"
							placeholder="Label"
							size="sm"
							class="w-full"
							:ui="{ rounded: 'rounded-lg' }" />
						<UInput
							v-model="field.value"
							placeholder="Value（可选）"
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
							移除字段
						</UButton>
					</div>
				</div>
				<UButton
					color="neutral"
					variant="soft"
					size="sm"
					icon="i-lucide-plus"
					@click="emit('add-custom-field')">
					新增自定义字段
				</UButton>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
	// 复用边界约束：该组件只负责字段渲染与事件分发，业务流程统一留在 composable。
	import type { DoneReasonOption, PriorityOption, StatusOption } from '@/config/task'
	import type { SpaceId } from '@/config/space'
	import type {
		CreateTaskFormState,
		LinkKindOption,
		ProjectOption,
	} from '../composables/useCreateTaskModal'

	type SpaceOption = {
		value: SpaceId
		label: string
		icon: string
		iconClass: string
	}

	const form = defineModel<CreateTaskFormState>('form', { required: true })
	const tagInput = defineModel<string>('tagInput', { required: true })

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
