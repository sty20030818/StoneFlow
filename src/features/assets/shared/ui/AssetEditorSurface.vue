<template>
	<div class="asset-editor-surface">
		<div
			v-if="label || languageLabel"
			class="asset-editor-surface__header">
			<div class="asset-editor-surface__label">
				<span v-if="label">{{ label }}</span>
				<span
					v-if="languageLabel"
					class="asset-editor-surface__language">
					{{ languageLabel }}
				</span>
			</div>
			<slot name="toolbar" />
		</div>
		<div
			ref="hostRef"
			class="asset-editor-surface__host"
			:style="{ minHeight: props.minHeight }" />
	</div>
</template>

<script setup lang="ts">
	import { basicSetup } from 'codemirror'
	import { css } from '@codemirror/lang-css'
	import { html } from '@codemirror/lang-html'
	import { javascript } from '@codemirror/lang-javascript'
	import { json } from '@codemirror/lang-json'
	import { markdown } from '@codemirror/lang-markdown'
	import { python } from '@codemirror/lang-python'
	import { rust } from '@codemirror/lang-rust'
	import { sql } from '@codemirror/lang-sql'
	import { Compartment, EditorState } from '@codemirror/state'
	import { oneDark } from '@codemirror/theme-one-dark'
	import { EditorView, placeholder } from '@codemirror/view'
	import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'

	type AssetEditorMode = 'code' | 'markdown'

	const props = withDefaults(
		defineProps<{
			mode?: AssetEditorMode
			language?: string | null
			label?: string
			placeholder?: string
			readonly?: boolean
			minHeight?: string
			languageLabel?: string | null
		}>(),
		{
			mode: 'code',
			language: null,
			label: '',
			placeholder: '',
			readonly: false,
			minHeight: '18rem',
			languageLabel: null,
		},
	)

	const model = defineModel<string>({
		required: true,
	})

	const hostRef = shallowRef<HTMLDivElement | null>(null)
	const editorView = shallowRef<EditorView | null>(null)
	const languageCompartment = new Compartment()
	const readonlyCompartment = new Compartment()
	const placeholderCompartment = new Compartment()

	function resolveLanguageExtension(mode: AssetEditorMode, language: string | null) {
		if (mode === 'markdown') {
			return markdown()
		}

		const normalized = language?.trim().toLowerCase() ?? ''
		if (['ts', 'tsx', 'typescript', 'js', 'jsx', 'javascript'].includes(normalized)) {
			return javascript({
				typescript: ['ts', 'tsx', 'typescript'].includes(normalized),
				jsx: ['jsx', 'tsx'].includes(normalized),
			})
		}
		if (normalized === 'json') {
			return json()
		}
		if (['html', 'vue', 'xml'].includes(normalized)) {
			return html()
		}
		if (['css', 'scss', 'less'].includes(normalized)) {
			return css()
		}
		if (normalized === 'sql') {
			return sql()
		}
		if (['py', 'python'].includes(normalized)) {
			return python()
		}
		if (['rs', 'rust'].includes(normalized)) {
			return rust()
		}
		return javascript()
	}

	const resolvedLanguageExtension = computed(() => resolveLanguageExtension(props.mode, props.language))

	function createTheme(minHeight: string) {
		return EditorView.theme({
			'&': {
				height: '100%',
				minHeight,
				fontSize: '13px',
				borderRadius: '1rem',
				overflow: 'hidden',
				backgroundColor: '#0f172a',
			},
			'.cm-scroller': {
				fontFamily: '"Iosevka Comfy", "Fira Code", "JetBrains Mono", monospace',
				lineHeight: '1.6',
				minHeight,
			},
			'.cm-content': {
				padding: '1rem 1rem 1.4rem',
			},
			'.cm-gutters': {
				backgroundColor: '#08111f',
				color: '#64748b',
				borderRight: '1px solid rgb(148 163 184 / 0.16)',
			},
			'.cm-activeLineGutter': {
				backgroundColor: 'rgb(14 165 233 / 0.16)',
				color: '#e2e8f0',
			},
			'.cm-activeLine': {
				backgroundColor: 'rgb(14 165 233 / 0.08)',
			},
			'.cm-cursor': {
				borderLeftColor: '#67e8f9',
			},
			'.cm-selectionBackground, .cm-content ::selection': {
				backgroundColor: 'rgb(34 211 238 / 0.26)',
			},
		})
	}

	onMounted(() => {
		if (!hostRef.value) return

		editorView.value = new EditorView({
			state: EditorState.create({
				doc: model.value,
				extensions: [
					basicSetup,
					oneDark,
					createTheme(props.minHeight),
					languageCompartment.of(resolvedLanguageExtension.value),
					readonlyCompartment.of(EditorState.readOnly.of(props.readonly)),
					placeholderCompartment.of(props.placeholder ? placeholder(props.placeholder) : []),
					EditorView.lineWrapping,
					EditorView.updateListener.of((update) => {
						if (!update.docChanged) return
						const next = update.state.doc.toString()
						if (next !== model.value) {
							model.value = next
						}
					}),
				],
			}),
			parent: hostRef.value,
		})
	})

	watch(
		() => model.value,
		(next) => {
			const view = editorView.value
			if (!view) return
			const current = view.state.doc.toString()
			if (current === next) return
			view.dispatch({
				changes: {
					from: 0,
					to: current.length,
					insert: next,
				},
			})
		},
	)

	watch(
		() => [props.mode, props.language] as const,
		() => {
			const view = editorView.value
			if (!view) return
			view.dispatch({
				effects: languageCompartment.reconfigure(resolvedLanguageExtension.value),
			})
		},
	)

	watch(
		() => props.readonly,
		(readonly) => {
			const view = editorView.value
			if (!view) return
			view.dispatch({
				effects: readonlyCompartment.reconfigure(EditorState.readOnly.of(readonly)),
			})
		},
	)

	watch(
		() => props.placeholder,
		(value) => {
			const view = editorView.value
			if (!view) return
			view.dispatch({
				effects: placeholderCompartment.reconfigure(value ? placeholder(value) : []),
			})
		},
	)

	onBeforeUnmount(() => {
		editorView.value?.destroy()
		editorView.value = null
	})
</script>

<style scoped>
	.asset-editor-surface {
		display: grid;
		gap: 0.6rem;
	}

	.asset-editor-surface__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.asset-editor-surface__label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgb(14 116 144);
	}

	.asset-editor-surface__language {
		padding: 0.16rem 0.48rem;
		border-radius: 999px;
		background: rgb(207 250 254 / 0.9);
		color: rgb(8 145 178);
	}

	.asset-editor-surface__host {
		width: 100%;
	}
</style>
