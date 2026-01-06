<template>
	<aside class="w-60 shrink-0 border-r border-default px-3 py-3 flex flex-col gap-4">
		<div class="px-1">
			<div class="text-xs font-medium text-muted mb-2">Space</div>
			<USelect
				v-model="space"
				size="sm"
				color="neutral"
				:items="spaceItems"
				value-key="value"
				class="w-full" />
		</div>

		<nav class="flex flex-col gap-1">
			<RouterLink
				v-for="item in nav"
				:key="item.to"
				:to="item.to"
				class="px-2 py-2 rounded-md text-sm hover:bg-elevated transition"
				:class="currentPath === item.to ? 'bg-elevated text-default' : 'text-muted'">
				{{ item.label }}
			</RouterLink>
		</nav>

		<div class="mt-auto px-2 text-xs text-muted">StoneFlow · M0</div>
	</aside>
</template>

<script setup lang="ts">
	import { computed } from 'vue'
	import { useRoute } from 'vue-router'

	import { useSpacesStore } from '@/stores/spaces'

	type Space = 'all' | 'work' | 'study' | 'personal'

	const route = useRoute()

	const nav = [
		{ to: '/today', label: 'Today' },
		{ to: '/inbox', label: 'Inbox' },
		{ to: '/projects', label: 'Projects' },
		{ to: '/finish', label: 'Finish' },
		{ to: '/settings', label: 'Settings' },
	]

	const spacesStore = useSpacesStore()

	const spaceItems = computed(() => {
		// M1：All 是“不过滤”的虚拟选项，不写入数据库。
		const items: { label: string; value: Space }[] = [{ label: 'All', value: 'all' }]
		for (const s of spacesStore.spaces) {
			// M1 约定：space.id 固定为 work/study/personal
			items.push({ label: s.name, value: s.id as Space })
		}
		return items
	})

	const currentPath = computed(() => route.path)

	// M0：Space 只做界面占位；后续在状态仓库中持久化并驱动过滤
	const space = defineModel<Space>('space', { default: 'all' })
</script>
