<template>
	<section class="space-y-6">
		<div v-motion="aboutCardMotions[0]">
			<AboutHeaderCard
				:app-name="appName"
				:current-version="currentVersion"
				:build-number="buildNumber"
				:last-checked-text="lastCheckedText"
				:update-state-label="updateStateLabel"
				:state="state"
				:advanced-open="advancedOpen"
				:auto-check-enabled="autoCheckEnabled"
				:prompt-install-enabled="promptInstallEnabled"
				:is-checking="state.status === 'checking'"
				:is-downloading="state.status === 'downloading'"
				:on-toggle-advanced="toggleAdvanced"
				:on-check-update="handleCheckUpdate"
				:on-preview-update-modal="handlePreviewUpdateModal"
				:on-download-update="handleDownloadUpdate"
				:on-restart="handleRestart"
				:on-open-release-page="openReleasePage"
				:on-open-changelog="openChangelog"
				:on-auto-check-change="handleAutoCheckChange"
				:on-prompt-install-change="handlePromptInstallChange" />
		</div>

		<!-- <AboutDownloadInstallSection
			:install-path="installPath"
			:data-path="dataPath"
			:on-open-release-page="openReleasePage"
			:on-copy-release-link="handleCopyReleaseLink"
			:on-open-install-path="openInstallPath"
			:on-open-data-path="openDataPath"
			:on-export-diagnostic="exportDiagnostic" /> -->

		<div v-motion="aboutCardMotions[1]">
			<AboutChangelogSection
				id="about-changelog"
				:entries="changelogSummary"
				:on-open-changelog="openChangelog" />
		</div>

		<div v-motion="aboutCardMotions[2]">
			<AboutLinksSection
				:links="aboutLinks"
				:on-open-link="openUrl"
				:on-copy-link="copy" />
		</div>

		<div v-motion="aboutCardMotions[3]">
			<AboutLegalSection
				:license-url="licenseUrl"
				:privacy-url="privacyUrl"
				:on-open-link="openUrl" />
		</div>
	</section>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import { createStaggeredEnterMotions, getAppStaggerDelay, useContentMotionPreset } from '@/composables/base/motion'
	import {
		AboutChangelogSection,
		// AboutDownloadInstallSection,
		AboutHeaderCard,
		AboutLegalSection,
		AboutLinksSection,
		useSettingsAboutPage,
	} from '@/features/settings'

	const {
		state,
		autoCheckEnabled,
		promptInstallEnabled,
		appName,
		currentVersion,
		buildNumber,
		// installPath,
		// dataPath,
		advancedOpen,
		aboutLinks,
		changelogSummary,
		licenseUrl,
		privacyUrl,
		lastCheckedText,
		updateStateLabel,
		handleCheckUpdate,
		handlePreviewUpdateModal,
		handleDownloadUpdate,
		handleRestart,
		openReleasePage,
		openChangelog,
		// handleCopyReleaseLink,
		// openInstallPath,
		// openDataPath,
		// exportDiagnostic,
		handleAutoCheckChange,
		handlePromptInstallChange,
		toggleAdvanced,
		openUrl,
		copy,
	} = useSettingsAboutPage()
	const aboutCardPreset = useContentMotionPreset('drawerSection')
	const aboutCardMotions = computed(() => createStaggeredEnterMotions(4, aboutCardPreset.value, getAppStaggerDelay))
</script>
