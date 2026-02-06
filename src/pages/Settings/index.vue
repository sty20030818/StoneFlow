<template>
	<section class="mx-auto w-full max-w-6xl">
		<div class="grid gap-6 lg:grid-cols-[260px,1fr]">
			<UCard class="h-fit rounded-3xl border border-default/70 bg-default">
				<template #header>
					<div class="space-y-1">
						<div class="text-sm font-semibold text-default">Settings</div>
						<div class="text-xs text-muted">管理应用配置与关于信息</div>
					</div>
				</template>
				<nav class="space-y-2">
					<RouterLink
						v-for="item in navItems"
						:key="item.id"
						:to="item.to"
						class="block rounded-2xl border px-3 py-2 transition-all duration-150"
						:class="isActive(item.to)
							? 'border-primary/40 bg-primary/8'
							: 'border-default/70 bg-elevated/20 hover:bg-elevated/40'">
						<div class="flex items-center gap-2">
							<UIcon
								:name="item.icon"
								class="size-4"
								:class="isActive(item.to) ? 'text-primary' : 'text-muted'" />
							<span class="text-sm font-medium text-default">{{ item.label }}</span>
						</div>
						<div class="mt-1 text-xs text-muted">{{ item.description }}</div>
					</RouterLink>
				</nav>
			</UCard>

			<div class="min-w-0">
				<RouterView />
			</div>
		</div>
	</section>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

import { SETTINGS_NAV_ITEMS } from './config'

const route = useRoute()
const navItems = SETTINGS_NAV_ITEMS

function isActive(path: string) {
	return route.path === path
}
</script>
