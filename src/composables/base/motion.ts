import type { MotionVariants, Transition, Variant } from '@vueuse/motion'
import { useReducedMotion } from '@vueuse/motion'
import { createGlobalState } from '@vueuse/core'
import { computed, ref } from 'vue'

import {
	getMotionPreset,
	PROJECT_MOTION_PHASE,
	type MotionMode,
	type MotionPresetName,
} from '@/config/motion'

type MotionPresetVariants = MotionVariants<string>

type RuntimeTransition = Transition & {
	delay?: number
}

export type ProjectMotionPhaseName = keyof typeof PROJECT_MOTION_PHASE

function applyDelay(variant: Variant | undefined, delay: number): Variant | undefined {
	if (!variant) return variant
	const rawTransition = variant.transition as RuntimeTransition | undefined
	const currentDelay = rawTransition?.delay ?? 0
	return {
		...variant,
		transition: {
			...(rawTransition ?? {}),
			delay: currentDelay + delay,
		},
	}
}

export function withMotionDelay(variants: MotionPresetVariants, delay: number): MotionPresetVariants {
	if (delay <= 0) return variants
	return {
		...variants,
		enter: applyDelay(variants.enter, delay),
		leave: applyDelay(variants.leave, delay),
		visible: applyDelay(variants.visible, delay),
		visibleOnce: applyDelay(variants.visibleOnce, delay),
	}
}

export function getProjectMotionPhaseDelay(phase: ProjectMotionPhaseName) {
	return PROJECT_MOTION_PHASE[phase]
}

const useMotionRuntime = createGlobalState(() => {
	// 预留 reduced-motion 接入口，默认关闭，保持当前视觉表现不变。
	const followSystemReducedPreference = ref(false)
	const systemReducedMotion = useReducedMotion()

	const mode = computed<MotionMode>(() => {
		if (!followSystemReducedPreference.value) return 'default'
		return systemReducedMotion.value ? 'reduced' : 'default'
	})

	return {
		mode,
		followSystemReducedPreference,
	}
})

export function useMotionRuntimeMode() {
	return useMotionRuntime()
}

export function useMotionPreset(name: MotionPresetName) {
	const runtime = useMotionRuntime()
	return computed(() => getMotionPreset(name, runtime.mode.value))
}

export function useProjectMotionPreset(name: MotionPresetName, phase: ProjectMotionPhaseName, offset = 0) {
	const preset = useMotionPreset(name)
	return computed(() => {
		const phaseDelay = getProjectMotionPhaseDelay(phase) + offset
		return withMotionDelay(preset.value, phaseDelay)
	})
}

export function getProjectStaggerDelay(
	index: number,
	basePhase: ProjectMotionPhaseName,
	stepPhase: ProjectMotionPhaseName = 'listStep',
	maxPhase: ProjectMotionPhaseName = 'listMax',
) {
	const base = getProjectMotionPhaseDelay(basePhase)
	const step = getProjectMotionPhaseDelay(stepPhase)
	const max = getProjectMotionPhaseDelay(maxPhase)
	return Math.min(base + Math.max(index, 0) * step, max)
}

// delay 使用毫秒，与 @vueuse/motion 的 transition.duration/delay 单位保持一致。
export function useMotionPresetWithDelay(name: MotionPresetName, delay = 0) {
	const preset = useMotionPreset(name)
	return computed(() => withMotionDelay(preset.value, delay))
}
