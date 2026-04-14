<template>
	<span class="inline-flex overflow-hidden rounded-[3px] align-middle">
		<img
			:src="flagSrc"
			alt=""
			aria-hidden="true"
			class="block size-full object-contain" />
	</span>
</template>

<script setup lang="ts">
	import { computed } from 'vue'

	import cnFlagUrl from '@/assets/locales/cn.svg'
	import usFlagUrl from '@/assets/locales/us.svg'

	type SupportedLocale = 'zh-CN' | 'en-US'

	const props = defineProps<{
		locale: SupportedLocale
	}>()

	// 统一从本地静态资源读取旗帜，避免依赖各系统对 emoji 的差异化渲染。
	const flagSrc = computed(() => (props.locale === 'zh-CN' ? cnFlagUrl : usFlagUrl))
</script>
