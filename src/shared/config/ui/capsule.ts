const joinClass = (...parts: Array<string | undefined | false>) => parts.filter(Boolean).join(' ')

export const HEADER_CAPSULE_BASE = joinClass(
	'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold whitespace-nowrap',
	'ring-1 ring-inset backdrop-blur-xl',
	'shadow-[0_10px_24px_-20px_rgba(15,23,42,0.28)] dark:shadow-[0_12px_28px_-22px_rgba(0,0,0,0.45)]',
	'transition-[background-color,border-color,color,box-shadow] duration-200 ease-out',
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
)

export const HEADER_CAPSULE_ICON = 'size-3.5 shrink-0 text-current'
export const HEADER_CAPSULE_INPUT_ICON = 'size-3.5 shrink-0 text-muted'

export const HEADER_CAPSULE_NEUTRAL = joinClass(
	'bg-default/78 text-default ring-default/65',
	'hover:bg-default/92',
	'focus-visible:ring-primary/35',
)

export const HEADER_CAPSULE_TINTED = joinClass(
	'bg-elevated/78 text-default ring-default/60',
	'hover:bg-elevated/95',
	'focus-visible:ring-primary/35',
)

export const HEADER_CAPSULE_STRONG = joinClass(
	'bg-inverted text-inverted ring-black/5',
	'hover:bg-inverted/92',
	'focus-visible:ring-primary/35',
)

export const HEADER_CAPSULE_DANGER = joinClass(
	'bg-error text-white ring-error/10',
	'hover:bg-error/92',
	'focus-visible:ring-error/35',
	'shadow-[0_12px_28px_-18px_rgba(239,68,68,0.45)] dark:shadow-[0_14px_30px_-20px_rgba(127,29,29,0.65)]',
)

export const HEADER_CAPSULE_INPUT = joinClass(
	'h-9 rounded-full border-0 px-4 ps-10 pe-4 text-xs text-default placeholder:text-muted',
	'bg-default/78 ring ring-inset ring-default/65',
	'shadow-[0_10px_24px_-20px_rgba(15,23,42,0.28)] dark:shadow-[0_12px_28px_-22px_rgba(0,0,0,0.45)]',
	'hover:bg-default/92 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35',
)

export const HEADER_CAPSULE_TONE_SLATE = joinClass(
	'bg-slate-600 text-white ring-slate-600/10',
	'hover:bg-slate-700',
	'focus-visible:ring-slate-300/85',
	'dark:bg-slate-500 dark:text-white dark:ring-slate-400/18 dark:hover:bg-slate-400',
)

export const HEADER_CAPSULE_TONE_BLUE = joinClass(
	'bg-blue-500 text-white ring-blue-500/10',
	'hover:bg-blue-600',
	'focus-visible:ring-blue-300/85',
	'dark:bg-blue-500 dark:text-white dark:ring-blue-400/18 dark:hover:bg-blue-400',
)

export const HEADER_CAPSULE_TONE_PURPLE = joinClass(
	'bg-purple-500 text-white ring-purple-500/10',
	'hover:bg-purple-600',
	'focus-visible:ring-purple-300/85',
	'dark:bg-purple-500 dark:text-white dark:ring-purple-400/18 dark:hover:bg-purple-400',
)

export const HEADER_CAPSULE_TONE_EMERALD = joinClass(
	'bg-emerald-500 text-white ring-emerald-500/10',
	'hover:bg-emerald-600',
	'focus-visible:ring-emerald-300/85',
	'dark:bg-emerald-500 dark:text-white dark:ring-emerald-400/18 dark:hover:bg-emerald-400',
)

export const HEADER_CAPSULE_TONE_PINK = joinClass(
	'bg-pink-500 text-white ring-pink-500/10',
	'hover:bg-pink-600',
	'focus-visible:ring-pink-300/85',
	'dark:bg-pink-500 dark:text-white dark:ring-pink-400/18 dark:hover:bg-pink-400',
)

export const HEADER_CAPSULE_TONE_GREEN = joinClass(
	'bg-green-500 text-white ring-green-500/10',
	'hover:bg-green-600',
	'focus-visible:ring-green-300/85',
	'dark:bg-green-500 dark:text-white dark:ring-green-400/18 dark:hover:bg-green-400',
)

export const HEADER_CAPSULE_TONE_ORANGE = joinClass(
	'bg-orange-500 text-white ring-orange-500/10',
	'hover:bg-orange-600',
	'focus-visible:ring-orange-300/85',
	'dark:bg-orange-500 dark:text-white dark:ring-orange-400/18 dark:hover:bg-orange-400',
)

export const HEADER_CAPSULE_TONE_CYAN = joinClass(
	'bg-cyan-500 text-white ring-cyan-500/10',
	'hover:bg-cyan-600',
	'focus-visible:ring-cyan-300/85',
	'dark:bg-cyan-500 dark:text-white dark:ring-cyan-400/18 dark:hover:bg-cyan-400',
)

export const HEADER_CAPSULE_TONE_YELLOW = joinClass(
	'bg-yellow-500 text-white ring-yellow-500/10',
	'hover:bg-yellow-600',
	'focus-visible:ring-yellow-300/85',
	'dark:bg-yellow-500 dark:text-white dark:ring-yellow-400/18 dark:hover:bg-yellow-400',
)

export const HEADER_CAPSULE_TONE_INDIGO = joinClass(
	'bg-indigo-500 text-white ring-indigo-500/10',
	'hover:bg-indigo-600',
	'focus-visible:ring-indigo-300/85',
	'dark:bg-indigo-500 dark:text-white dark:ring-indigo-400/18 dark:hover:bg-indigo-400',
)

export const HEADER_CAPSULE_TONE_RED = joinClass(
	'bg-red-500 text-white ring-red-500/10',
	'hover:bg-red-600',
	'focus-visible:ring-red-300/85',
	'dark:bg-red-500 dark:text-white dark:ring-red-400/18 dark:hover:bg-red-400',
)

export const HEADER_CAPSULE_TONE_AMBER = joinClass(
	'bg-amber-500 text-white ring-amber-500/10',
	'hover:bg-amber-600',
	'focus-visible:ring-amber-300/85',
	'dark:bg-amber-500 dark:text-white dark:ring-amber-400/18 dark:hover:bg-amber-400',
)

export const HEADER_CAPSULE_TONE_SKY = joinClass(
	'bg-sky-500 text-white ring-sky-500/10',
	'hover:bg-sky-600',
	'focus-visible:ring-sky-300/85',
	'dark:bg-sky-500 dark:text-white dark:ring-sky-400/18 dark:hover:bg-sky-400',
)

export const HEADER_CAPSULE_TONE_VIOLET = joinClass(
	'bg-violet-500 text-white ring-violet-500/10',
	'hover:bg-violet-600',
	'focus-visible:ring-violet-300/85',
	'dark:bg-violet-500 dark:text-white dark:ring-violet-400/18 dark:hover:bg-violet-400',
)

export const HEADER_CAPSULE_TONE_ROSE = joinClass(
	'bg-rose-500 text-white ring-rose-500/10',
	'hover:bg-rose-600',
	'focus-visible:ring-rose-300/85',
	'dark:bg-rose-500 dark:text-white dark:ring-rose-400/18 dark:hover:bg-rose-400',
)

export { joinClass as joinCapsuleClass }
