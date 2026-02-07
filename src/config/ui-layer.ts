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
	return {
		...config,
		overlay: joinClass('z-layer-modal-overlay', config.overlay),
		content: joinClass('z-layer-modal-content', config.content),
	}
}

/**
 * 全局统一 Drawer(Slideover) 层级配置。
 */
export function createDrawerLayerUi(config: LayerUiConfig = {}) {
	return {
		...config,
		overlay: joinClass('z-layer-drawer-overlay', config.overlay),
		wrapper: joinClass('z-layer-drawer', config.wrapper),
		content: joinClass('z-layer-drawer', config.content),
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
