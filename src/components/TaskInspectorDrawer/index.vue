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
				<div v-motion="drawerHeaderMotion">
					<DrawerHeader
						:current-space-label="currentSpaceLabel"
						:current-space-icon="currentSpaceIcon"
						:space-pill-class="spacePillClass"
						:project-trail="projectTrail"
						:save-state-visible="saveStateVisible"
						:save-state-label="saveStateLabel"
						:save-state-class="saveStateClass"
						:save-state-dot-class="saveStateDotClass"
						:can-retry-save="retrySaveAvailable"
						:on-retry-save="onRetrySave" />
				</div>

				<div class="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">
					<div v-motion="statusSectionMotion">
						<StatusSection
							:status-local="statusLocal"
							:done-reason-local="doneReasonLocal"
							:status-options="statusSegmentOptions"
							:done-reason-options="doneReasonOptions"
							:on-status-segment-click="onStatusSegmentClick"
							:on-done-reason-change="onDoneReasonChange" />
					</div>

					<div v-motion="titleSectionMotion">
						<section class="space-y-2">
							<!-- <label class="text-[10px] font-semibold text-muted uppercase tracking-widest">标题</label> -->
							<UInput
								v-model="titleLocal"
								placeholder="任务标题..."
								size="xl"
								variant="none"
								:ui="{
									root: 'w-full',
									base: 'px-0 py-0 text-2xl font-semibold leading-tight bg-transparent border-none rounded-none focus:ring-0 placeholder:text-muted/40',
								}"
								@focus="onTitleFocus"
								@compositionstart="onTitleCompositionStart"
								@compositionend="onTitleCompositionEnd"
								@blur="onTitleBlur" />
						</section>
					</div>

					<div class="space-y-3">
						<div v-motion="prioritySectionMotion">
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
								:on-add-custom-field="addCustomField"
								@update:priority="onPriorityChange"
								@update:deadline="handleDeadlineUpdate" />
						</div>

						<div v-motion="locationSectionMotion">
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
						</div>

						<div v-motion="advancedSectionMotion">
							<AdvancedSection
								v-model:custom-fields="customFieldsLocal"
								v-model:draft-title="customFieldDraftTitle"
								v-model:draft-value="customFieldDraftValue"
								v-model:draft-visible="customFieldDraftVisible"
								:editing-error-index="customFieldValidationErrorIndex"
								:on-confirm-custom-field="confirmCustomField"
								:on-remove-custom-field="removeCustomField"
								:on-custom-field-input="clearCustomFieldValidationError"
								:interaction="customFieldsInteraction"
								:on-flush-custom-field-edits="flushPendingUpdates" />
						</div>
					</div>

					<div v-motion="tagsSectionMotion">
						<TagsSection
							v-model:tag-input="tagInput"
							:tags="tagsLocal"
							:on-add-tag="addTag"
							:on-remove-tag="removeTag"
							:on-tag-input-blur="onTagInputBlur" />
					</div>

					<div v-motion="noteSectionMotion">
						<NoteSection
							v-model:note="noteLocal"
							:interaction="noteInteraction" />
					</div>

					<div v-motion="linksSectionMotion">
						<LinksSection
							v-model:links="linksLocal"
							v-model:draft-title="linkDraftTitle"
							v-model:draft-kind="linkDraftKind"
							v-model:draft-url="linkDraftUrl"
							v-model:draft-visible="linkDraftVisible"
							:link-kind-options="linkKindOptions"
							:editing-error-index="linkValidationErrorIndex"
							:on-add-link-draft="addLinkDraft"
							:on-confirm-link="addLink"
							:on-remove-link="removeLink"
							:on-link-input="clearLinkValidationError"
							:interaction="linksInteraction"
							:on-flush-link-edits="flushPendingUpdates" />
					</div>

					<div v-motion="timelineSectionMotion">
						<TimelineSection
							:timeline-logs="timelineLogs"
							:timeline-loading="timelineLoading"
							:timeline-empty="timelineEmpty"
							:timeline-error-message="timelineErrorMessage"
							:timeline-collapsed="timelineCollapsed"
							:reload-timeline="reloadTimeline"
							:toggle-timeline="toggleTimeline" />
					</div>
				</div>

				<footer class="px-6 py-3 border-t border-default bg-elevated/40 flex items-center justify-between gap-3">
					<div class="flex items-center gap-2 min-w-0">
						<UAvatar
							:src="avatarUrl"
							alt="Stonefish"
							size="sm"
							:ui="{
								root: 'rounded-full ring-1 ring-default/40',
							}" />
						<span class="text-xs font-semibold text-default truncate">Stonefish</span>
					</div>
					<div class="text-[11px] font-medium text-default">{{ createdAtFooterLabel }}</div>
				</footer>
			</div>
		</template>
	</USlideover>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import avatarUrl from '@/assets/avatar.png'
	import { getProjectMotionPhaseDelay, useProjectMotionPreset } from '@/composables/base/motion'
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
		retrySaveAvailable,
		spaceIdLocal,
		projectIdLocal,
		linksLocal,
		linkValidationErrorIndex,
		linkDraftTitle,
		linkDraftKind,
		linkDraftUrl,
		linkDraftVisible,
		customFieldsLocal,
		customFieldValidationErrorIndex,
		customFieldDraftTitle,
		customFieldDraftValue,
		customFieldDraftVisible,
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
		timelineLogs,
		timelineLoading,
		timelineEmpty,
		timelineErrorMessage,
		reloadTimeline,
		onTitleBlur,
		onTitleFocus,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onStatusSegmentClick,
		onDoneReasonChange,
		onPriorityChange,
		onDeadlineChange,
		addTag,
		removeTag,
		onTagInputBlur,
		addLinkDraft,
		addLink,
		removeLink,
		clearLinkValidationError,
		addCustomField,
		confirmCustomField,
		removeCustomField,
		clearCustomFieldValidationError,
		onSpaceChange,
		onProjectChange,
		onNoteBlur,
		onNoteFocus,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onLinksEditStart,
		onLinksEditEnd,
		onLinksCompositionStart,
		onLinksCompositionEnd,
		onCustomFieldsEditStart,
		onCustomFieldsEditEnd,
		onCustomFieldsCompositionStart,
		onCustomFieldsCompositionEnd,
		onRetrySave,
		flushPendingUpdates,
		toggleTimeline,
	} = useTaskInspectorDrawer()

	const noteInteraction = {
		onFocus: onNoteFocus,
		onBlur: onNoteBlur,
		onCompositionStart: onNoteCompositionStart,
		onCompositionEnd: onNoteCompositionEnd,
	}

	const linksInteraction = {
		onEditStart: onLinksEditStart,
		onEditEnd: onLinksEditEnd,
		onCompositionStart: onLinksCompositionStart,
		onCompositionEnd: onLinksCompositionEnd,
	}

	const customFieldsInteraction = {
		onEditStart: onCustomFieldsEditStart,
		onEditEnd: onCustomFieldsEditEnd,
		onCompositionStart: onCustomFieldsCompositionStart,
		onCompositionEnd: onCustomFieldsCompositionEnd,
	}

	const drawerUi = createDrawerLayerUi({
		content:
			'w-[480px] max-w-[calc(100vw-1.5rem)] h-[calc(100%-1.5rem)] my-3 mr-3 flex flex-col rounded-3xl border border-default bg-default/92 backdrop-blur-2xl shadow-2xl overflow-hidden',
	})
	const drawerSectionStep = getProjectMotionPhaseDelay('drawerSectionStep')
	const drawerHeaderMotion = useProjectMotionPreset('drawerSection', 'drawerHeader')
	const statusSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart')
	const titleSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 1)
	const prioritySectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 2)
	const locationSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 3)
	const advancedSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 4)
	const tagsSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 5)
	const noteSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 6)
	const linksSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 7)
	const timelineSectionMotion = useProjectMotionPreset('drawerSection', 'drawerSectionStart', drawerSectionStep * 8)

	const handleDeadlineUpdate = (val: string) => {
		deadlineLocal.value = val
		onDeadlineChange()
	}

	const saveStateVisible = computed(() => saveState.value !== 'idle')

	const createdAtFooterLabel = computed(() => {
		const timestamp = currentTask.value?.createdAt
		if (!timestamp) return '创建时间未知'

		const date = new Date(timestamp)
		if (Number.isNaN(date.getTime())) return '创建时间未知'

		const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'] as const
		const year = date.getFullYear()
		const month = date.getMonth() + 1
		const day = date.getDate()
		const hour = String(date.getHours()).padStart(2, '0')
		const minute = String(date.getMinutes()).padStart(2, '0')
		const weekday = weekdays[date.getDay()]

		return `${year}.${month}.${day} ${weekday} ${hour}:${minute}`
	})
</script>
