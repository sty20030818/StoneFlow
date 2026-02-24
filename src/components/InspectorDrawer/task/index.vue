<template>
	<DrawerShell
		v-if="currentTask"
		v-model:open="isOpen"
		:title="t('inspector.task.title')"
		:description="t('inspector.task.description')"
		:content-class="DRAWER_CONTENT_CLASS">
		<div class="flex flex-col h-full">
			<div v-motion="drawerHeaderMotion">
				<DrawerBreadcrumbHeader
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
					<DrawerTitleInputSection
						v-model:title="titleLocal"
						:placeholder="t('inspector.task.placeholders.title')"
						:on-focus="onTitleFocus"
						:on-blur="onTitleBlur"
						:on-composition-start="onTitleCompositionStart"
						:on-composition-end="onTitleCompositionEnd" />
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
					<DrawerTagsSection
						v-model:tag-input="tagInput"
						:tags="tagsLocal"
						:on-add-tag="addTag"
						:on-remove-tag="removeTag"
						:on-tag-input-blur="onTagInputBlur" />
				</div>

				<div v-motion="noteSectionMotion">
					<DrawerNoteSection
						v-model:note="noteLocal"
						:interaction="noteInteraction" />
				</div>

				<div v-motion="linksSectionMotion">
					<DrawerLinksSection
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
					<DrawerTimelineSection
						:timeline-logs="timelineLogs"
						:timeline-loading="timelineLoading"
						:timeline-empty="timelineEmpty"
						:timeline-error-message="timelineErrorMessage"
						:reload-timeline="reloadTimeline"
						:collapsible="true"
						:collapsed="timelineCollapsed"
						:toggle-collapsed="toggleTimeline" />
				</div>
			</div>

			<DrawerFooterInfo
				:creator-name="currentTask.createBy || t('inspector.footer.defaultCreator')"
				:right-text="createdAtFooterLabel" />
		</div>
	</DrawerShell>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
	import DrawerShell from '@/components/InspectorDrawer/shared/DrawerShell.vue'
	import { DRAWER_CONTENT_CLASS } from '@/components/InspectorDrawer/shared/constants'
	import {
		DrawerBreadcrumbHeader,
		DrawerFooterInfo,
		DrawerLinksSection,
		DrawerNoteSection,
		DrawerTagsSection,
		DrawerTimelineSection,
		DrawerTitleInputSection,
	} from '@/components/InspectorDrawer/shared/sections'
	import { getProjectMotionPhaseDelay, useProjectMotionPreset } from '@/composables/base/motion'
	import AdvancedSection from './components/AdvancedSection.vue'
	import LocationSection from './components/LocationSection.vue'
	import PriorityDeadlineSection from './components/PriorityDeadlineSection.vue'
	import StatusSection from './components/StatusSection.vue'
	import { useTaskDrawerInteractions, useTaskDrawerPresentation, useTaskInspectorDrawer } from './composables'
	const { t } = useI18n({ useScope: 'global' })

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

	const { noteInteraction, linksInteraction, customFieldsInteraction } = useTaskDrawerInteractions({
		onNoteFocus,
		onNoteBlur,
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

	const { saveStateVisible, createdAtFooterLabel } = useTaskDrawerPresentation({
		currentTask,
		saveState,
	})
</script>
