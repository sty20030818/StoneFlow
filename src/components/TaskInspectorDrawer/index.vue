<template>
	<USlideover
		v-if="currentTask"
		v-model:open="isOpen"
		title="任务详情"
		description="查看与编辑当前任务的详细信息"
		side="right"
		:ui="drawerUi"
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
						<label class="text-[10px] font-semibold text-muted uppercase tracking-widest">标题</label>
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

					<TagsSection
						v-model:tag-input="tagInput"
						:tags="tagsLocal"
						:on-add-tag="addTag"
						:on-remove-tag="removeTag"
						:on-tag-input-blur="onTagInputBlur" />

					<NoteSection
						v-model:note="noteLocal"
						:on-note-blur="onNoteBlur" />

					<LinksSection
						v-model:links="linksLocal"
						:link-kind-options="linkKindOptions"
						:on-add-link="addLink"
						:on-remove-link="removeLink"
						:on-links-input="onLinksInput"
						:on-links-blur="onLinksBlur" />

					<AdvancedSection
						v-model:custom-fields="customFieldsLocal"
						:advanced-collapsed="advancedCollapsed"
						:on-toggle-advanced="toggleAdvanced"
						:on-add-custom-field="addCustomField"
						:on-remove-custom-field="removeCustomField"
						:on-custom-fields-input="onCustomFieldsInput"
						:on-custom-fields-blur="onCustomFieldsBlur" />

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
	import AdvancedSection from './components/AdvancedSection.vue'
	import LinksSection from './components/LinksSection.vue'
	import LocationSection from './components/LocationSection.vue'
	import NoteSection from './components/NoteSection.vue'
	import PriorityDeadlineSection from './components/PriorityDeadlineSection.vue'
	import StatusSection from './components/StatusSection.vue'
	import TagsSection from './components/TagsSection.vue'
	import TimelineSection from './components/TimelineSection.vue'
	import { createDrawerLayerUi } from '@/config/ui-layer'
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
		advancedCollapsed,
		saveState,
		spaceIdLocal,
		projectIdLocal,
		linksLocal,
		customFieldsLocal,
		statusSegmentOptions,
		doneReasonOptions,
		priorityOptions,
		spaceOptions,
		projectOptions,
		linkKindOptions,
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
		addLink,
		removeLink,
		onLinksInput,
		onLinksBlur,
		addCustomField,
		removeCustomField,
		onCustomFieldsInput,
		onCustomFieldsBlur,
		toggleAdvanced,
		onSpaceChange,
		onProjectChange,
		onNoteBlur,
		toggleTimeline,
	} = useTaskInspectorDrawer()

	const drawerUi = createDrawerLayerUi({
		content: 'w-[560px] h-full flex flex-col bg-default/90 backdrop-blur-2xl border-l border-default',
	})

	const handleDeadlineUpdate = (val: string) => {
		deadlineLocal.value = val
		onDeadlineChange()
	}

	const saveStateVisible = computed(() => saveState.value !== 'idle')
</script>
