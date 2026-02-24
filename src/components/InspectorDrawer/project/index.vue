<template>
	<DrawerShell
		v-if="currentProject"
		v-model:open="isOpen"
		title="项目设置"
		description="查看并编辑当前项目信息"
		:content-class="DRAWER_CONTENT_CLASS.project">
		<div class="flex h-full flex-col">
			<DrawerBreadcrumbHeader
				:current-space-label="currentSpaceLabel"
				:current-space-icon="currentSpaceIcon"
				:space-pill-class="spacePillClass"
				:project-trail="projectTrail"
				:save-state-visible="isSaveStateVisible"
				:save-state-label="saveStateLabel"
				:save-state-class="saveStateClass"
				:save-state-dot-class="saveStateDotClass"
				:can-retry-save="canRetrySave"
				:on-retry-save="onRetrySave" />

			<div class="flex-1 min-h-0 space-y-5 overflow-y-auto px-6 py-5">
				<ProjectSummarySection
					:status-badge-color="statusBadgeColor"
					:status-dot-class="statusDotClass"
					:status-label="statusLabel"
					:todo-task-count="currentProject.todoTaskCount"
					:done-task-count="currentProject.doneTaskCount"
					:last-updated-label="lastUpdatedLabel"
					:shortcut-hint="shortcutHint" />

				<DrawerTitleInputSection
					v-model:title="titleLocal"
					:disabled="isStructureLocked"
					placeholder="请输入项目标题"
					autofocus
					:helper-text="isStructureLocked ? '默认项目的标题与父级不可编辑。' : ''"
					:on-focus="onTitleFocus"
					:on-blur="onTitleBlur"
					:on-composition-start="onTitleCompositionStart"
					:on-composition-end="onTitleCompositionEnd" />

				<ProjectAttributesSection
					:is-structure-locked="isStructureLocked"
					:priority-card-class="priorityCardClass"
					:priority-icon-class="priorityIconClass"
					:priority-text-class="priorityTextClass"
					:priority-icon="priorityIcon"
					:priority-label="priorityLabel"
					:priority-option-items="priorityOptionItems"
					:status-card-class="statusCardClass"
					:status-icon-name="statusIconName"
					:status-icon-class="statusIconClass"
					:status-text-class="statusTextClass"
					:status-label="statusLabel"
					:status-action-available="statusActionAvailable"
					:status-option-items="statusOptionItems"
					:space-card-icon="spaceCardIcon"
					:space-card-class="spaceCardClass"
					:space-card-label-class="spaceCardLabelClass"
					:space-card-value-class="spaceCardValueClass"
					:current-space-label="currentSpaceLabel"
					:space-option-items="spaceOptionItems"
					:space-option-empty-text="spaceOptionEmptyText"
					:parent-card-class="parentCardClass"
					:current-parent-icon-class="currentParentIconClass"
					:current-parent-label="currentParentLabel"
					:parent-option-items="parentOptionItems"
					:on-priority-select="onPrioritySelect"
					:on-status-action-select="onStatusActionSelect"
					:on-space-select="onSpaceSelect"
					:on-parent-select="onParentSelect" />

				<DrawerTagsSection
					v-model:tag-input="tagInput"
					:tags="tagsLocal"
					:on-add-tag="addTag"
					:on-remove-tag="removeTag"
					:on-tag-input-blur="onTagInputBlur" />

				<DrawerLinksSection
					v-model:links="linksLocal"
					v-model:draft-title="linkDraftTitle"
					v-model:draft-kind="linkDraftKind"
					v-model:draft-url="linkDraftUrl"
					v-model:draft-visible="linkDraftVisible"
					:link-kind-options="linkKindOptions"
					:editing-error-index="linkValidationErrorIndex"
					:on-add-link-draft="addLinkDraft"
					:on-confirm-link="confirmLinkDraft"
					:on-remove-link="removeLink"
					:on-link-input="clearLinkValidationError"
					:on-flush-link-edits="flushPendingUpdates"
					:interaction="linksInteraction" />

				<DrawerNoteSection
					v-model:note="noteLocal"
					:interaction="noteInteraction"
					:rows="4"
					placeholder="为项目补充更多上下文信息..." />

				<DrawerTimelineSection
					:timeline-logs="timelineLogs"
					:timeline-loading="timelineLoading"
					:timeline-empty="timelineEmpty"
					:timeline-error-message="timelineErrorMessage"
					:reload-timeline="reloadTimeline"
					:collapsible="false" />
			</div>

			<DrawerFooterInfo
				:creator-name="currentProject.createBy || 'Stonefish'"
				:right-text="createdAtFooterLabel" />
		</div>
	</DrawerShell>

	<ProjectLifecycleModals
		v-model:archive-open="confirmArchiveOpen"
		v-model:delete-open="confirmDeleteOpen"
		:is-archiving-project="isArchivingProject"
		:is-deleting-project="isDeletingProject"
		:on-confirm-archive="onConfirmArchiveProject"
		:on-confirm-delete="onConfirmDeleteProject" />
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { storeToRefs } from 'pinia'

	import DrawerShell from '@/components/InspectorDrawer/shared/DrawerShell.vue'
	import {
		DrawerBreadcrumbHeader,
		DrawerFooterInfo,
		DrawerLinksSection,
		DrawerNoteSection,
		DrawerTagsSection,
		DrawerTimelineSection,
		DrawerTitleInputSection,
	} from '@/components/InspectorDrawer/shared/sections'
	import { DRAWER_CONTENT_CLASS } from '@/components/InspectorDrawer/shared/constants'
	import { useRefreshSignalsStore } from '@/stores/refresh-signals'
	import { ProjectAttributesSection, ProjectLifecycleModals, ProjectSummarySection } from './sections'
	import {
		useProjectDrawerAttributes,
		useProjectDrawerInteractions,
		useProjectDrawerPresentation,
		useProjectInspectorActivityLogs,
		useProjectInspectorDrawer,
		useProjectLifecycleActions,
	} from './composables'

	const {
		currentProject,
		isOpen,
		titleLocal,
		noteLocal,
		priorityLocal,
		spaceIdLocal,
		parentIdLocal,
		tagsLocal,
		tagInput,
		linksLocal,
		linkDraftTitle,
		linkDraftUrl,
		linkDraftKind,
		linkDraftVisible,
		linkValidationErrorIndex,
		priorityOptions,
		spaceOptions,
		parentOptions,
		linkKindOptions,
		rootLabel,
		isStructureLocked,
		isSaveStateVisible,
		canRetrySave,
		canDeleteProject,
		canArchiveProject,
		hasChildProjects,
		isLifecycleBusy,
		isDeletingProject,
		isArchivingProject,
		saveState,
		addTag,
		removeTag,
		onTagInputBlur,
		addLinkDraft,
		confirmLinkDraft,
		removeLink,
		clearLinkValidationError,
		onTitleFocus,
		onTitleBlur,
		onTitleCompositionStart,
		onTitleCompositionEnd,
		onNoteFocus,
		onNoteBlur,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onLinkFieldFocus,
		onLinkFieldBlur,
		onLinkCompositionStart,
		onLinkCompositionEnd,
		onSpaceChange,
		onRetrySave,
		deleteCurrentProject,
		archiveCurrentProject,
		flushPendingUpdates,
	} = useProjectInspectorDrawer()

	const refreshSignals = useRefreshSignalsStore()
	const { projectTick } = storeToRefs(refreshSignals)

	const { timelineLogs, timelineLoading, timelineErrorMessage, timelineEmpty, reloadTimeline } =
		useProjectInspectorActivityLogs({
			currentProject,
			projectTick,
		})

	const { noteInteraction, linksInteraction } = useProjectDrawerInteractions({
		onNoteFocus,
		onNoteBlur,
		onNoteCompositionStart,
		onNoteCompositionEnd,
		onLinkFieldFocus,
		onLinkFieldBlur,
		onLinkCompositionStart,
		onLinkCompositionEnd,
	})

	const {
		confirmDeleteOpen,
		confirmArchiveOpen,
		onRequestDeleteProject,
		onConfirmDeleteProject,
		onRequestArchiveProject,
		onConfirmArchiveProject,
	} = useProjectLifecycleActions({
		isLifecycleBusy,
		deleteCurrentProject,
		archiveCurrentProject,
	})

	const {
		saveStateLabel,
		saveStateClass,
		saveStateDotClass,
		statusLabel,
		statusDotClass,
		statusBadgeColor,
		createdAtFooterLabel,
		lastUpdatedLabel,
		currentSpaceLabel,
		currentSpaceIcon,
		spacePillClass,
		projectTrail,
		shortcutHint,
		spaceDisplay,
	} = useProjectDrawerPresentation({
		currentProject,
		saveState,
		spaceIdLocal,
	})

	const statusDisplayValue = computed(() => currentProject.value?.computedStatus ?? 'inProgress')

	const {
		priorityLabel,
		priorityIcon,
		priorityCardClass,
		priorityIconClass,
		priorityTextClass,
		priorityOptionItems,
		statusCardClass,
		statusIconName,
		statusIconClass,
		statusTextClass,
		statusActionAvailable,
		statusOptionItems,
		spaceCardIcon,
		spaceCardClass,
		spaceCardLabelClass,
		spaceCardValueClass,
		spaceOptionItems,
		spaceOptionEmptyText,
		currentParentLabel,
		currentParentIconClass,
		parentCardClass,
		parentOptionItems,
		onPrioritySelect,
		onSpaceSelect,
		onParentSelect,
		onStatusActionSelect,
	} = useProjectDrawerAttributes({
		priorityLocal,
		spaceIdLocal,
		parentIdLocal,
		priorityOptions: computed(() => priorityOptions),
		spaceOptions: computed(() => spaceOptions),
		parentOptions,
		rootLabel: computed(() => rootLabel),
		isStructureLocked,
		hasChildProjects,
		isLifecycleBusy,
		isArchivingProject,
		isDeletingProject,
		canArchiveProject,
		canDeleteProject,
		statusDisplayValue,
		spaceDisplay,
		onSpaceChange,
		onRequestArchiveProject,
		onRequestDeleteProject,
	})
</script>
