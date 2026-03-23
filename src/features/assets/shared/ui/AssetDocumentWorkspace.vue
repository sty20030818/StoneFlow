<template>
	<section class="asset-document-workspace">
		<aside class="asset-document-workspace__sidebar">
			<slot name="sidebar" />
		</aside>

		<div class="asset-document-workspace__main">
			<header class="asset-document-workspace__header">
				<div class="asset-document-workspace__title-wrap">
					<div class="asset-document-workspace__title">{{ title }}</div>
					<div
						v-if="description"
						class="asset-document-workspace__description">
						{{ description }}
					</div>
				</div>

				<div class="asset-document-workspace__mode">
					<UButton
						color="neutral"
						:variant="modeModel === 'edit' ? 'solid' : 'ghost'"
						size="xs"
						icon="i-lucide-pencil-line"
						@click="modeModel = 'edit'">
						编辑
					</UButton>
					<UButton
						color="neutral"
						:variant="modeModel === 'preview' ? 'solid' : 'ghost'"
						size="xs"
						icon="i-lucide-panel-right-open"
						@click="modeModel = 'preview'">
						预览
					</UButton>
				</div>
			</header>

			<div class="asset-document-workspace__content">
				<div
					v-show="modeModel === 'edit'"
					class="asset-document-workspace__panel">
					<slot name="editor" />
				</div>
				<div
					v-show="modeModel === 'preview'"
					class="asset-document-workspace__panel">
					<slot name="preview" />
				</div>
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
	type WorkspaceMode = 'edit' | 'preview'

	type Props = {
		title: string
		description?: string
	}

	defineProps<Props>()

	const modeModel = defineModel<WorkspaceMode>('mode', {
		default: 'edit',
	})
</script>

<style scoped>
	.asset-document-workspace {
		display: grid;
		grid-template-columns: minmax(15rem, 18rem) minmax(0, 1fr);
		gap: 1rem;
		min-height: 0;
	}

	.asset-document-workspace__sidebar,
	.asset-document-workspace__main {
		min-height: 0;
	}

	.asset-document-workspace__sidebar {
		padding: 1rem;
		border: 1px solid rgb(226 232 240 / 0.85);
		border-radius: 1.6rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.95), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top, rgb(125 211 252 / 0.14), transparent 45%);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.88),
			0 16px 30px rgb(15 23 42 / 0.06);
		overflow: auto;
	}

	.asset-document-workspace__main {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 0.9rem;
	}

	.asset-document-workspace__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.1rem;
		border: 1px solid rgb(226 232 240 / 0.85);
		border-radius: 1.6rem;
		background:
			linear-gradient(180deg, rgb(255 255 255 / 0.96), rgb(248 250 252 / 0.94)),
			radial-gradient(circle at top right, rgb(251 191 36 / 0.14), transparent 30%);
	}

	.asset-document-workspace__title {
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: rgb(15 23 42);
	}

	.asset-document-workspace__description {
		margin-top: 0.24rem;
		font-size: 0.78rem;
		line-height: 1.55;
		color: rgb(71 85 105);
	}

	.asset-document-workspace__mode {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.2rem;
		border-radius: 999px;
		background: rgb(241 245 249);
	}

	.asset-document-workspace__content {
		min-height: 0;
	}

	.asset-document-workspace__panel {
		height: 100%;
	}

	@media (max-width: 960px) {
		.asset-document-workspace {
			grid-template-columns: 1fr;
		}
	}
</style>
