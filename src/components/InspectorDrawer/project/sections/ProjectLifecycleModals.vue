<template>
	<UModal
		v-model:open="archiveOpenModel"
		title="确认归档"
		description="确认归档当前项目">
		<template #body>
			<p class="text-sm text-muted">归档后项目状态会变为“已归档”，仍可在抽屉中取消归档。</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="archiveOpenModel = false">
				取消
			</UButton>
			<UButton
				color="warning"
				size="sm"
				:loading="isArchivingProject"
				@click="onConfirmArchive">
				确认归档
			</UButton>
		</template>
	</UModal>

	<UModal
		v-model:open="deleteOpenModel"
		title="确认删除"
		description="确认删除当前项目">
		<template #body>
			<p class="text-sm text-muted">删除后项目会进入回收站，可在回收站或抽屉内恢复。</p>
		</template>
		<template #footer>
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				@click="deleteOpenModel = false">
				取消
			</UButton>
			<UButton
				color="error"
				size="sm"
				:loading="isDeletingProject"
				@click="onConfirmDelete">
				确认删除
			</UButton>
		</template>
	</UModal>
</template>

<script setup lang="ts">
	const archiveOpenModel = defineModel<boolean>('archiveOpen', { required: true })
	const deleteOpenModel = defineModel<boolean>('deleteOpen', { required: true })

	type Props = {
		isArchivingProject: boolean
		isDeletingProject: boolean
		onConfirmArchive: () => void | Promise<void>
		onConfirmDelete: () => void | Promise<void>
	}

	defineProps<Props>()
</script>
