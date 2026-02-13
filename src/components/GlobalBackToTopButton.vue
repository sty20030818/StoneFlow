<template>
	<div
		ref="buttonRef"
		class="z-layer-fab absolute right-10 bottom-20"
		:class="isVisible ? 'pointer-events-auto' : 'pointer-events-none'">
		<UButton
			type="button"
			icon="i-lucide-arrow-up"
			color="neutral"
			variant="soft"
			aria-label="回到顶部"
			:tabindex="isVisible ? 0 : -1"
			class="size-11 rounded-full border border-default/70 bg-default/85 text-default shadow-[0_12px_28px_rgba(15,23,42,0.2)] backdrop-blur-xl hover:bg-default hover:text-primary"
			:ui="{
				base: 'justify-center transition-colors duration-200',
				leadingIcon: 'size-4',
			}"
			@click="scrollToTop" />
	</div>
</template>

<script setup lang="ts">
	import { useMotion } from '@vueuse/motion'
	import { useEventListener } from '@vueuse/core'
	import { computed, ref, toRef, watch } from 'vue'

	import { useMotionPreset, withMotionDelay } from '@/composables/base/motion'

	type Props = {
		scrollContainer: HTMLElement | null
		threshold?: number
		minDelta?: number
	}

	const props = withDefaults(defineProps<Props>(), {
		threshold: 240,
		minDelta: 8,
	})

	const isVisible = ref(false)
	const lastTop = ref(0)
	const buttonRef = ref<HTMLElement | null>(null)
	const scrollContainerRef = toRef(props, 'scrollContainer')
	const backToTopPreset = useMotionPreset('backToTop')
	const backToTopMotion = computed(() => withMotionDelay(backToTopPreset.value, 16))
	const backToTopMotionInstance = useMotion(buttonRef, backToTopMotion, {
		syncVariants: false,
		lifeCycleHooks: false,
		eventListeners: false,
		visibilityHooks: false,
	})

	function handleScroll() {
		const container = scrollContainerRef.value
		if (!container) return

		const currentTop = container.scrollTop
		if (currentTop <= props.threshold) {
			isVisible.value = false
			lastTop.value = currentTop
			return
		}

		const delta = currentTop - lastTop.value
		// 过滤触控板高频微抖动，避免按钮在边界场景闪烁。
		if (Math.abs(delta) < props.minDelta) return

		isVisible.value = delta > 0
		lastTop.value = currentTop
	}

	function scrollToTop() {
		const container = scrollContainerRef.value
		if (!container) return
		container.scrollTo({
			top: 0,
			behavior: 'smooth',
		})
	}

	watch(
		scrollContainerRef,
		(container) => {
			if (!container) {
				isVisible.value = false
				lastTop.value = 0
				return
			}
			lastTop.value = container.scrollTop
			handleScroll()
		},
		{ immediate: true },
	)

	watch(
		buttonRef,
		(button) => {
			if (!button) return
			backToTopMotionInstance.set('leave')
		},
		{ immediate: true, flush: 'post' },
	)

	watch(
		isVisible,
		(visible) => {
			if (!buttonRef.value) return
			void backToTopMotionInstance.apply(visible ? 'enter' : 'leave')
		},
		{ immediate: true, flush: 'post' },
	)

	useEventListener(scrollContainerRef, 'scroll', handleScroll, { passive: true })
</script>
