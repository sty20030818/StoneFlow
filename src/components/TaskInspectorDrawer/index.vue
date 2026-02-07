<template>
	<USlideover
		v-if="currentTask"
		v-model:open="isOpen"
		title="任务详情"
		description="查看与编辑当前任务的详细信息"
		side="right"
		:ui="{
			content: 'w-[560px] h-full flex flex-col bg-default/90 backdrop-blur-2xl border-l border-default z-50',
			wrapper: 'z-50',
		}"
		:close="false">
		<template #content>
			<div class="flex flex-col h-full">
				<DrawerHeader
					:current-space-label="currentSpaceLabel"
					:current-space-icon="currentSpaceIcon"
					:space-pill-class="spacePillClass"
					:project-trail="projectTrail"
					:save-state-visible="saveStateVisible"
					:save-state-label="saveStateLabel"
					:save-state-class="saveStateClass"
					:save-state-dot-class="saveStateDotClass"
					@close="close" />

				<div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
					<StatusSection
						:status-local="statusLocal"
						:done-reason-local="doneReasonLocal"
						:status-options="statusSegmentOptions"
						:done-reason-options="doneReasonOptions"
						:on-status-segment-click="onStatusSegmentClick"
						:on-done-reason-change="onDoneReasonChange" />

					<section class="space-y-2">
						<UInput
							v-model="titleLocal"
							placeholder="任务标题..."
							size="xl"
							variant="none"
							:ui="{
								root: 'w-full',
								base: 'px-0 py-0 text-2xl font-semibold leading-tight bg-transparent border-none focus:ring-0 placeholder:text-muted/40',
							}"
							@blur="onTitleBlur" />
					</section>

					<PriorityDeadlineSection
						:priority="priorityLocal"
						:deadline="deadlineLocal"
						:priority-icon="priorityIcon"
						:priority-label="priorityLabel"
						:priority-options="priorityOptions"
						:priority-card-class="priorityCardClass"
						:priority-icon-class="priorityIconClass"
						:priority-text-class="priorityTextClass"
						:deadline-label="deadlineLabel"
						@update:priority="onPriorityChange"
						@update:deadline="handleDeadlineUpdate" />

					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Tags</label>
						<div class="flex flex-wrap gap-2 items-center">
							<div
								v-for="tag in tagsLocal"
								:key="tag"
								class="group relative px-3 py-1.5 bg-white rounded-lg text-xs font-bold shadow-sm border border-default/40 text-default flex items-center justify-center cursor-default hover:border-primary/50 transition-colors overflow-hidden">
								<span>#{{ tag }}</span>
								<div
									class="hidden group-hover:flex absolute inset-0 bg-white/95 items-center justify-center cursor-pointer transition-opacity"
									@click="removeTag(tag)">
									<UIcon
										name="i-lucide-x"
										class="size-3 text-red-500" />
								</div>
							</div>

							<div class="flex items-center">
								<input
									v-model="tagInput"
									type="text"
									placeholder="+ New Tag"
									class="bg-transparent border-none text-xs font-medium placeholder:text-muted/60 focus:ring-0 focus:outline-none w-[100px] h-8 px-2"
									@keydown.enter.prevent="addTag"
									@blur="onTagInputBlur" />
							</div>
						</div>
					</section>

					<LocationSection
						:space-options="spaceOptions"
						:project-options="projectOptions"
						:space-id-local="spaceIdLocal"
						:project-id-local="projectIdLocal"
						:space-card-class="spaceCardClass"
						:space-card-label-class="spaceCardLabelClass"
						:space-card-value-class="spaceCardValueClass"
						:current-space-label="currentSpaceLabel"
						:current-project-label="currentProjectLabel"
						:on-space-change="onSpaceChange"
						:on-project-change="onProjectChange" />

					<section class="space-y-2">
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">Note</label>
						<div class="p-4 rounded-2xl border bg-elevated/50 border-default/60 hover:bg-elevated/80 transition-all">
							<UTextarea
								v-model="noteLocal"
								placeholder="记录一些背景信息、想法或链接…"
								:rows="6"
								size="sm"
								autoresize
								variant="none"
								:ui="{
									root: 'w-full',
									base: 'p-0 text-sm leading-relaxed bg-transparent border-none focus:ring-0 placeholder:text-muted/40',
								}"
								@blur="onNoteBlur" />
						</div>
					</section>

					<TimelineSection
						:timeline-items="timelineItems"
						:timeline-collapsed="timelineCollapsed"
						:toggle-timeline="toggleTimeline" />
				</div>
			</div>
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import DrawerHeader from './components/DrawerHeader.vue'
	import LocationSection from './components/LocationSection.vue'
	import PriorityDeadlineSection from './components/PriorityDeadlineSection.vue'
	import StatusSection from './components/StatusSection.vue'
	import TimelineSection from './components/TimelineSection.vue'
	import { useTaskInspectorDrawer } from './composables/useTaskInspectorDrawer'

	const {
		currentTask,
		isOpen,
		close,
		titleLocal,
		statusLocal,
		doneReasonLocal,
		priorityLocal,
		deadlineLocal,
		noteLocal,
		tagsLocal,
		tagInput,
		timelineCollapsed,
		saveState,
		spaceIdLocal,
		projectIdLocal,
		statusSegmentOptions,
		doneReasonOptions,
		priorityOptions,
		spaceOptions,
		projectOptions,
		priorityIcon,
		priorityLabel,
		priorityCardClass,
		priorityIconClass,
		priorityTextClass,
		spaceCardClass,
		spaceCardLabelClass,
		spaceCardValueClass,
		currentProjectLabel,
		deadlineLabel,
		currentSpaceLabel,
		currentSpaceIcon,
		spacePillClass,
		projectTrail,
		saveStateLabel,
		saveStateClass,
		saveStateDotClass,
		timelineItems,
		onTitleBlur,
		onStatusSegmentClick,
		onDoneReasonChange,
		onPriorityChange,
		onDeadlineChange,
		addTag,
		removeTag,
		onTagInputBlur,
		onSpaceChange,
		onProjectChange,
		onNoteBlur,
		toggleTimeline,
	} = useTaskInspectorDrawer()

	const handleDeadlineUpdate = (val: string) => {
		deadlineLocal.value = val
		onDeadlineChange()
	}

	const saveStateVisible = computed(() => saveState.value !== 'idle')
</script>
