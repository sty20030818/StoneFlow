<template>
	<header
		class="h-14 shrink-0 border-b border-default px-5 flex items-center justify-between bg-default/80 backdrop-blur-sm">
		<div class="flex items-center gap-3">
			<div
				v-if="pageIcon"
				class="flex items-center justify-center w-9 h-9 rounded-xl bg-elevated/80 shadow-sm ring-1 ring-default/50">
				<UIcon
					:name="pageIcon"
					:class="['size-5', pageIconClass]" />
			</div>
			<div class="flex flex-col gap-0.5">
				<span class="text-[15px] font-semibold text-default leading-tight">{{ pageTitle }}</span>
				<span
					v-if="pageDescription"
					class="text-xs text-muted leading-tight">
					{{ pageDescription }}
				</span>
			</div>
		</div>

		<div class="flex items-center gap-2">
			<UButton
				color="neutral"
				variant="ghost"
				size="sm"
				class="gap-1"
				@click="openCommandPalette">
				<UKbd value="meta" />
				<UKbd value="K" />
			</UButton>
		</div>
	</header>
</template>

<script setup lang="ts">
	import { computed, inject } from 'vue'
	import { useRoute } from 'vue-router'

	// Space 页面配置
	const spaceConfigs: Record<string, { title: string; description: string; icon: string; iconClass: string }> = {
		work: {
			title: 'Work',
			description: '工作相关任务',
			icon: 'i-lucide-briefcase',
			iconClass: 'text-blue-500',
		},
		personal: {
			title: 'Personal',
			description: '个人事务',
			icon: 'i-lucide-user',
			iconClass: 'text-purple-500',
		},
		study: {
			title: 'Study',
			description: '学习相关任务',
			icon: 'i-lucide-book-open',
			iconClass: 'text-green-500',
		},
	}

	const route = useRoute()

	const pageTitle = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return spaceConfigs[spaceId]?.title ?? spaceId
		}
		return String(route.meta.title ?? '')
	})

	const pageIcon = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return spaceConfigs[spaceId]?.icon ?? 'i-lucide-folder'
		}
		return String(route.meta.icon ?? '')
	})

	const pageIconClass = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return spaceConfigs[spaceId]?.iconClass ?? 'text-gray-500'
		}
		return String(route.meta.iconClass ?? '')
	})

	const pageDescription = computed(() => {
		if (route.path.startsWith('/space/')) {
			const spaceId = route.params.spaceId as string
			return spaceConfigs[spaceId]?.description ?? '任务列表'
		}
		return String(route.meta.description ?? '')
	})

	const commandPalette = inject<{ open: () => void }>('commandPalette')

	function openCommandPalette() {
		commandPalette?.open()
	}
</script>
