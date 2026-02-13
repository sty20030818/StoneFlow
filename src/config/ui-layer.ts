type LayerUiConfig = {
	overlay?: string
	content?: string
	wrapper?: string
	width?: string
	rounded?: string
}

const joinClass = (...parts: Array<string | undefined>) => parts.filter(Boolean).join(' ')

/**
 * 全局统一 Modal 层级配置，避免每个页面散落定义 overlay/content 层级。
 */
export function createModalLayerUi(config: LayerUiConfig = {}) {
	const { overlay, content, width, rounded, ...rest } = config
	return {
		...rest,
		overlay: joinClass('z-layer-modal-overlay', overlay),
		// Nuxt UI v4 通过 content slot 控制容器样式，宽度与圆角统一并入 content。
		content: joinClass('z-layer-modal-content', width, rounded, content),
	}
}

/**
 * 全局统一 Drawer(Slideover) 层级配置。
 */
export function createDrawerLayerUi(config: LayerUiConfig = {}) {
	const { overlay, wrapper, content, width, rounded, ...rest } = config
	return {
		...rest,
		overlay: joinClass('z-layer-drawer-overlay', overlay),
		wrapper,
		// Nuxt UI v4 通过 content slot 控制抽屉面板样式。
		content: joinClass('z-layer-drawer', width, rounded, content),
	}
}

/**
 * 普通 Popover 层级配置。
 */
export function createPopoverLayerUi(config: LayerUiConfig = {}) {
	return {
		...config,
		content: joinClass('z-layer-popover', config.content),
	}
}

/**
 * Drawer 内部 Popover 层级配置。
 */
export function createDrawerPopoverLayerUi(config: LayerUiConfig = {}) {
	return {
		...config,
		content: joinClass('z-layer-drawer-popover', config.content),
	}
}
