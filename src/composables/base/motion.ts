import type { MotionVariants, Transition, Variant } from '@vueuse/motion'
import { useReducedMotion } from '@vueuse/motion'
import { createGlobalState } from '@vueuse/core'
import { computed, ref } from 'vue'

import {
	APP_MOTION_PHASE,
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
export type AppMotionPhaseName = keyof typeof APP_MOTION_PHASE
type SegmentSwitchMotionOptions = {
	base?: MotionPresetVariants
	hoverTransition?: Transition
	switchTransition?: Transition
}

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

export function getAppMotionPhaseDelay(phase: AppMotionPhaseName) {
	return APP_MOTION_PHASE[phase]
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

export function useCardHoverMotionPreset() {
	const cardPreset = useMotionPreset('card')
	return computed<MotionPresetVariants>(() => ({
		initial: {
			y: 0,
			scale: 1,
		},
		enter: {
			y: 0,
			scale: 1,
			transition: cardPreset.value.hovered?.transition,
		},
		hovered: cardPreset.value.hovered,
	}))
}

export function createSegmentSwitchMotionVariants(
	isActive: boolean,
	options: SegmentSwitchMotionOptions = {},
): MotionPresetVariants {
	const base = options.base
	const switchTransition = options.switchTransition ?? options.hoverTransition ?? base?.enter?.transition
	const hoverTransition = options.hoverTransition ?? switchTransition
	return {
		...(base ?? {}),
		initial: {
			...(base?.initial ?? {}),
			y: 0,
			scale: 1,
		},
		enter: {
			...(base?.enter ?? {}),
			y: isActive ? -1 : 0,
			scale: isActive ? 1.01 : 1,
			transition: base?.enter?.transition ?? switchTransition,
		},
		hovered: {
			y: isActive ? -1.5 : -1,
			scale: isActive ? 1.015 : 1.01,
			transition: hoverTransition,
		},
		tapped: {
			y: 0,
			scale: isActive ? 0.995 : 0.99,
			transition: switchTransition,
		},
	}
}

export function useProjectMotionPreset(name: MotionPresetName, phase: ProjectMotionPhaseName, offset = 0) {
	const preset = useMotionPreset(name)
	return computed(() => {
		const phaseDelay = getProjectMotionPhaseDelay(phase) + offset
		return withMotionDelay(preset.value, phaseDelay)
	})
}

export function useAppMotionPreset(name: MotionPresetName, phase: AppMotionPhaseName, offset = 0) {
	const preset = useMotionPreset(name)
	return computed(() => {
		const phaseDelay = getAppMotionPhaseDelay(phase) + offset
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

export function getAppStaggerDelay(
	index: number,
	basePhase: AppMotionPhaseName = 'listBase',
	stepPhase: AppMotionPhaseName = 'listStep',
	maxPhase: AppMotionPhaseName = 'listMax',
) {
	const base = getAppMotionPhaseDelay(basePhase)
	const step = getAppMotionPhaseDelay(stepPhase)
	const max = getAppMotionPhaseDelay(maxPhase)
	return Math.min(base + Math.max(index, 0) * step, max)
}

// delay 使用毫秒，与 @vueuse/motion 的 transition.duration/delay 单位保持一致。
export function useMotionPresetWithDelay(name: MotionPresetName, delay = 0) {
	const preset = useMotionPreset(name)
	return computed(() => withMotionDelay(preset.value, delay))
}
