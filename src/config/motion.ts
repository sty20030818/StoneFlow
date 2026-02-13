import type { MotionVariants, Transition, Variant } from '@vueuse/motion'

export type MotionMode = 'default' | 'reduced'

export type MotionPresetName =
	| 'page'
	| 'card'
	| 'listItem'
	| 'drawerSection'
	| 'statusFeedback'
	| 'modalSection'

type MotionPresetVariants = MotionVariants<string>

type MotionPresetDefinition = {
	default: MotionPresetVariants
	reduced: MotionPresetVariants
}

type MotionEase = [number, number, number, number]

export const APP_MOTION_PHASE = {
	routePage: 0,
	layoutShell: 10,
	sectionBase: 24,
	sectionStep: 18,
	sectionMax: 220,
	listBase: 56,
	listStep: 20,
	listMax: 300,
	modalBody: 24,
	modalFooter: 44,
	stateAction: 12,
} as const

export const PROJECT_MOTION_PHASE = {
	...APP_MOTION_PHASE,
	headerShell: 16,
	headerBreadcrumb: 28,
	headerActions: 42,
	editStrip: 58,
	sidebarShell: 8,
	sidebarSpaceSegment: 20,
	sidebarProjectHeader: 34,
	sidebarProjectTree: 50,
	sidebarLibrary: 66,
	sidebarUser: 82,
	columnTodoHeader: 22,
	columnDoneHeader: 34,
	columnTodoInline: 46,
	columnTodoEmpty: 62,
	columnDoneEmpty: 74,
	listTodoBase: 58,
	listDoneBase: 72,
	listStep: APP_MOTION_PHASE.listStep,
	listMax: APP_MOTION_PHASE.listMax,
	drawerHeader: 20,
	drawerSectionStart: 36,
	drawerSectionStep: 18,
} as const

export const MOTION_TOKENS = {
	duration: {
		fast: 180,
		base: 280,
		slow: 360,
	},
	distance: {
		xs: 8,
		sm: 14,
		md: 20,
	},
	ease: {
		standard: [0.22, 1, 0.36, 1] as MotionEase,
		decelerate: [0.16, 1, 0.3, 1] as MotionEase,
		accelerate: [0.4, 0, 1, 1] as MotionEase,
	},
}

function buildTransition(duration: number, ease: MotionEase = MOTION_TOKENS.ease.standard, delay = 0): Transition {
	return {
		type: 'tween',
		duration,
		ease,
		delay,
	}
}

function withTransition(variant: Variant, transition: Transition): Variant {
	return {
		...variant,
		transition,
	}
}

const pageDefault: MotionPresetVariants = {
	initial: { opacity: 0, x: -24 },
	enter: withTransition(
		{ opacity: 1, x: 0 },
		buildTransition(320, MOTION_TOKENS.ease.decelerate),
	),
	leave: withTransition(
		{ opacity: 0, x: 18 },
		buildTransition(220, MOTION_TOKENS.ease.accelerate),
	),
}

const pageReduced: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition({ opacity: 1 }, buildTransition(180)),
	leave: withTransition({ opacity: 0 }, buildTransition(140)),
}

const cardDefault: MotionPresetVariants = {
	initial: { opacity: 0, y: 0, scale: 1 },
	enter: withTransition(
		{ opacity: 1, y: 0, scale: 1 },
		buildTransition(260, MOTION_TOKENS.ease.decelerate),
	),
	leave: withTransition(
		{ opacity: 0, y: 0, scale: 1 },
		buildTransition(180, MOTION_TOKENS.ease.accelerate),
	),
	hovered: withTransition(
		{ y: -4, scale: 1.01 },
		buildTransition(MOTION_TOKENS.duration.fast, MOTION_TOKENS.ease.standard),
	),
}

const cardReduced: MotionPresetVariants = {
	initial: { opacity: 0, y: 0, scale: 1 },
	enter: withTransition({ opacity: 1, y: 0, scale: 1 }, buildTransition(MOTION_TOKENS.duration.fast)),
	leave: withTransition({ opacity: 0, y: 0, scale: 1 }, buildTransition(MOTION_TOKENS.duration.fast)),
}

const listItemDefault: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition(
		{ opacity: 1 },
		buildTransition(220, MOTION_TOKENS.ease.decelerate),
	),
	leave: withTransition(
		{ opacity: 0 },
		buildTransition(170, MOTION_TOKENS.ease.accelerate),
	),
}

const listItemReduced: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition({ opacity: 1 }, buildTransition(MOTION_TOKENS.duration.fast)),
	leave: withTransition({ opacity: 0 }, buildTransition(MOTION_TOKENS.duration.fast)),
}

const drawerSectionDefault: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition(
		{ opacity: 1 },
		buildTransition(240, MOTION_TOKENS.ease.decelerate),
	),
	leave: withTransition(
		{ opacity: 0 },
		buildTransition(170, MOTION_TOKENS.ease.accelerate),
	),
}

const drawerSectionReduced: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition({ opacity: 1 }, buildTransition(MOTION_TOKENS.duration.fast)),
	leave: withTransition({ opacity: 0 }, buildTransition(MOTION_TOKENS.duration.fast)),
}

const statusFeedbackDefault: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition(
		{ opacity: 1 },
		buildTransition(180, MOTION_TOKENS.ease.decelerate),
	),
	leave: withTransition(
		{ opacity: 0 },
		buildTransition(120, MOTION_TOKENS.ease.accelerate),
	),
}

const statusFeedbackReduced: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition({ opacity: 1 }, buildTransition(140)),
	leave: withTransition({ opacity: 0 }, buildTransition(120)),
}

const modalSectionDefault: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition(
		{ opacity: 1 },
		buildTransition(260, MOTION_TOKENS.ease.decelerate),
	),
	leave: withTransition(
		{ opacity: 0 },
		buildTransition(180, MOTION_TOKENS.ease.accelerate),
	),
}

const modalSectionReduced: MotionPresetVariants = {
	initial: { opacity: 0 },
	enter: withTransition({ opacity: 1 }, buildTransition(MOTION_TOKENS.duration.fast)),
	leave: withTransition({ opacity: 0 }, buildTransition(MOTION_TOKENS.duration.fast)),
}

export const MOTION_PRESETS: Record<MotionPresetName, MotionPresetDefinition> = {
	page: {
		default: pageDefault,
		reduced: pageReduced,
	},
	card: {
		default: cardDefault,
		reduced: cardReduced,
	},
	listItem: {
		default: listItemDefault,
		reduced: listItemReduced,
	},
	drawerSection: {
		default: drawerSectionDefault,
		reduced: drawerSectionReduced,
	},
	statusFeedback: {
		default: statusFeedbackDefault,
		reduced: statusFeedbackReduced,
	},
	modalSection: {
		default: modalSectionDefault,
		reduced: modalSectionReduced,
	},
}

export function getMotionPreset(name: MotionPresetName, mode: MotionMode = 'default'): MotionPresetVariants {
	return MOTION_PRESETS[name][mode]
}
