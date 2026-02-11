<template>
	<section class="space-y-6">
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

		<!-- <AboutDownloadInstallSection
			:install-path="installPath"
			:data-path="dataPath"
			:on-open-release-page="openReleasePage"
			:on-copy-release-link="handleCopyReleaseLink"
			:on-open-install-path="openInstallPath"
			:on-open-data-path="openDataPath"
			:on-export-diagnostic="exportDiagnostic" /> -->

		<AboutChangelogSection
			id="about-changelog"
			:entries="changelogSummary"
			:on-open-changelog="openChangelog" />

		<AboutLinksSection
			:links="aboutLinks"
			:on-open-link="openUrl"
			:on-copy-link="copy" />

		<AboutLegalSection
			:license-url="licenseUrl"
			:privacy-url="privacyUrl"
			:on-open-link="openUrl" />
	</section>
</template>

<script setup lang="ts">
	import AboutChangelogSection from './components/AboutChangelogSection.vue'
	// import AboutDownloadInstallSection from './components/AboutDownloadInstallSection.vue'
	import AboutHeaderCard from './components/AboutHeaderCard.vue'
	import AboutLegalSection from './components/AboutLegalSection.vue'
	import AboutLinksSection from './components/AboutLinksSection.vue'
	import { useAboutPage } from './composables/useAboutPage'

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
	} = useAboutPage()
</script>
