<template>
	<UModal
		v-model:open="archiveOpenModel"
		:title="t('inspector.project.modals.archive.title')"
		:description="t('inspector.project.modals.archive.description')">
		<template #body>
			<p class="text-sm text-muted">{{ t('inspector.project.modals.archive.body') }}</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="archiveOpenModel = false">
				{{ t('common.actions.cancel') }}
			</UButton>
			<UButton
				color="warning"
				size="sm"
				:loading="isArchivingProject"
				@click="onConfirmArchive">
				{{ t('inspector.project.modals.archive.confirm') }}
			</UButton>
		</template>
	</UModal>

	<UModal
		v-model:open="deleteOpenModel"
		:title="t('inspector.project.modals.delete.title')"
		:description="t('inspector.project.modals.delete.description')">
		<template #body>
			<p class="text-sm text-muted">{{ t('inspector.project.modals.delete.body') }}</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="deleteOpenModel = false">
				{{ t('common.actions.cancel') }}
			</UButton>
			<UButton
				color="error"
				size="sm"
				:loading="isDeletingProject"
				@click="onConfirmDelete">
				{{ t('inspector.project.modals.delete.confirm') }}
			</UButton>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	const archiveOpenModel = defineModel<boolean>('archiveOpen', { required: true })
	const deleteOpenModel = defineModel<boolean>('deleteOpen', { required: true })
	const { t } = useI18n({ useScope: 'global' })

	type Props = {
		isArchivingProject: boolean
		isDeletingProject: boolean
		onConfirmArchive: () => void | Promise<void>
		onConfirmDelete: () => void | Promise<void>
	}

	defineProps<Props>()
</script>
