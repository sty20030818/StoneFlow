export { default as AppShellHeaderProvider } from './AppShellHeaderProvider.vue'
export { createShellHeaderController, resolveShellHeaderState } from './controller'
export {
	bindShellHeaderContribution,
	provideShellHeaderController,
	useRegisterShellHeader,
	useShellHeaderController,
} from './use-shell-header'
export { useRouteMetaShellBreadcrumb } from './useRouteMetaShellBreadcrumb'
export type {
	ShellHeaderBreadcrumbItem,
	ShellHeaderContribution,
	ShellHeaderController,
	ShellHeaderLayerRegistration,
	ShellHeaderLayerSnapshot,
	ShellHeaderResolvedState,
	ShellHeaderSearchVisibility,
} from './types'
