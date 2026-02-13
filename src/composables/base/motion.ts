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
type ActionIconHoverMotionOptions = {
	hoverY?: number
	hoverScale?: number
	hoverRotate?: number
}
type StaggeredEnterMotionOptions = {
	limit?: number
	fallback?: MotionPresetVariants
}

export const DEFAULT_STAGGER_MOTION_LIMIT = 24

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

function stripVariantTransition(variant: Variant | undefined): Variant {
	if (!variant) return {}
	const { transition: _transition, ...state } = variant as Variant & { transition?: Transition }
	return state
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

export function useActionIconHoverMotion(options: ActionIconHoverMotionOptions = {}) {
	const cardPreset = useMotionPreset('card')
	// 统一「小图标/按钮」hover 细节，避免在各组件重复手写 variants。
	return computed<MotionPresetVariants>(() => ({
		initial: {
			y: 0,
			scale: 1,
			rotate: 0,
		},
		enter: {
			y: 0,
			scale: 1,
			rotate: 0,
			transition: cardPreset.value.hovered?.transition,
		},
		hovered: {
			y: options.hoverY ?? 0,
			scale: options.hoverScale ?? 1.05,
			rotate: options.hoverRotate ?? 0,
			transition: cardPreset.value.hovered?.transition,
		},
	}))
}

export function toStaticMotionVariants(variants: MotionPresetVariants): MotionPresetVariants {
	// 生成“静态变体”：保持最终样式，但不再执行可感知入场动画。
	const staticState = stripVariantTransition(variants.enter)
	return {
		...variants,
		initial: staticState,
		enter: {
			...staticState,
			transition: {
				type: 'tween',
				duration: 0,
				delay: 0,
			},
		},
	}
}

export function resolveStaggeredEnterMotion(
	index: number,
	base: MotionPresetVariants,
	getDelay: (index: number) => number,
	options: StaggeredEnterMotionOptions = {},
): MotionPresetVariants {
	// 长列表只给前 limit 项保留 stagger 入场，后续项回落为静态，降低抖动与重排成本。
	const limit = options.limit ?? Number.POSITIVE_INFINITY
	const fallback = options.fallback ?? toStaticMotionVariants(base)
	if (index >= limit) return fallback
	return withMotionDelay(base, getDelay(index))
}

export function createStaggeredEnterMotions(
	count: number,
	base: MotionPresetVariants,
	getDelay: (index: number) => number,
	options: StaggeredEnterMotionOptions = {},
): MotionPresetVariants[] {
	return Array.from({ length: count }).map((_item, index) =>
		resolveStaggeredEnterMotion(index, base, getDelay, options),
	)
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
