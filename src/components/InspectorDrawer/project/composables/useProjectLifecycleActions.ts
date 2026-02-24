import { ref, type Ref } from 'vue'

export function useProjectLifecycleActions(params: {
	isLifecycleBusy: Ref<boolean>
	deleteCurrentProject: () => Promise<boolean>
	archiveCurrentProject: () => Promise<boolean>
}) {
	const confirmDeleteOpen = ref(false)
	const confirmArchiveOpen = ref(false)

	function onRequestDeleteProject() {
		if (params.isLifecycleBusy.value) return
		confirmDeleteOpen.value = true
	}

	async function onConfirmDeleteProject() {
		const ok = await params.deleteCurrentProject()
		if (ok) {
			confirmDeleteOpen.value = false
		}
	}

	function onRequestArchiveProject() {
		if (params.isLifecycleBusy.value) return
		confirmArchiveOpen.value = true
	}

	async function onConfirmArchiveProject() {
		const ok = await params.archiveCurrentProject()
		if (ok) {
			confirmArchiveOpen.value = false
		}
	}

	return {
		confirmDeleteOpen,
		confirmArchiveOpen,
		onRequestDeleteProject,
		onConfirmDeleteProject,
		onRequestArchiveProject,
		onConfirmArchiveProject,
	}
}
