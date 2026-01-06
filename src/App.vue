<template>
	<!--
    Nuxt UI v4（Vue 项目）建议用 UApp 包裹根节点，
    否则 toast / tooltip / modal 等全局能力可能不可用。
  -->
	<UApp :toaster="{ position: 'bottom-right', duration: 3000, max: 5 }">
		<AppShell>
			<RouterView />
		</AppShell>
	</UApp>
</template>

<script setup lang="ts">
	import AppShell from './layouts/AppShell.vue'
</script>
