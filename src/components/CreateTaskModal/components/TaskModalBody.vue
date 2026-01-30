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

		<div class="grid grid-cols-2 gap-4">
			<UFormField label="Space">
				<USelectMenu
					v-model="form.spaceId"
					:items="spaceOptions"
					value-key="value"
					label-key="label"
					size="md"
					class="w-full"
					:search-input="false"
					:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
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
					:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
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
					:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
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
					:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
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
				:ui="{ rounded: 'rounded-xl', width: 'w-full' }">
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
	</div>
</template>

<script setup lang="ts">
	import type { DoneReasonOption, PriorityOption, StatusOption } from '@/config/task'
	import type { SpaceId } from '@/config/space'
	import type { CreateTaskFormState, ProjectOption } from '../composables/useCreateTaskModal'

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
		uncategorizedLabel: string
	}>()

	const emit = defineEmits<{
		submit: []
		'add-tag': []
		'remove-tag': [tag: string]
	}>()
</script>
