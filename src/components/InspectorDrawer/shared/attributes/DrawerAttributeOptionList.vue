<template>
	<div class="p-2">
		<template v-if="items.length > 0">
			<button
				v-for="item in items"
				:key="toItemKey(item.value)"
				type="button"
				class="w-full rounded-lg px-3 py-2 text-left transition-colors"
				:class="resolveItemClass(item)"
				:style="resolveItemStyle(item)"
				:disabled="item.disabled"
				@click="onSelect(item.value)">
				<div class="flex items-center gap-2">
					<UIcon
						v-if="item.icon || item.loading"
						:name="item.loading ? 'i-lucide-loader-circle' : item.icon"
						class="size-4 shrink-0"
						:class="resolveIconClass(item)" />
					<span
						class="truncate text-sm"
						:class="item.labelClass">
						{{ item.label }}
					</span>
				</div>
			</button>
		</template>
		<p
			v-else
			class="rounded-lg bg-elevated/60 px-3 py-2 text-xs text-muted">
			{{ resolvedEmptyText }}
		</p>
	</div>
</template>

<script setup lang="ts">
	import { useI18n } from 'vue-i18n'
	import { computed } from 'vue'

	type OptionValue = string | number | boolean | null

	export type DrawerAttributeOptionItem = {
		value: OptionValue
		label: string
		icon?: string
		iconClass?: string
		labelClass?: string
		active?: boolean
		disabled?: boolean
		loading?: boolean
		indentPx?: number
	}

	type Props = {
		items: DrawerAttributeOptionItem[]
		emptyText?: string
	}

	const props = withDefaults(defineProps<Props>(), {
		emptyText: undefined,
	})
	const { t } = useI18n({ useScope: 'global' })
	const resolvedEmptyText = computed(() => props.emptyText ?? t('inspector.attribute.emptyOptions'))

	const emit = defineEmits<{
		select: [value: OptionValue]
	}>()

	function toItemKey(value: OptionValue): string {
		if (value === null) return '__null__'
		return String(value)
	}

	function onSelect(value: OptionValue) {
		emit('select', value)
	}

	function resolveItemClass(item: DrawerAttributeOptionItem): string {
		if (item.disabled) return 'cursor-not-allowed opacity-60'
		if (item.active) return 'bg-elevated'
		return 'cursor-pointer hover:bg-elevated'
	}

	function resolveIconClass(item: DrawerAttributeOptionItem): string {
		const baseClass = item.iconClass ?? ''
		if (item.loading) {
			return `animate-spin ${baseClass}`.trim()
		}
		return baseClass
	}

	function resolveItemStyle(item: DrawerAttributeOptionItem): { paddingLeft?: string } {
		if (item.indentPx === undefined) return {}
		return {
			paddingLeft: `${item.indentPx}px`,
		}
	}
</script>
