import { inject, onScopeDispose, provide, toValue, watchEffect, type InjectionKey, type MaybeRefOrGetter } from 'vue'

import { createShellHeaderController } from './controller'
import type { ShellHeaderContribution, ShellHeaderController, ShellHeaderLayerRegistration } from './types'

const SHELL_HEADER_CONTROLLER_KEY: InjectionKey<ShellHeaderController> = Symbol('shellHeaderController')

export function provideShellHeaderController(controller = createShellHeaderController()): ShellHeaderController {
	provide(SHELL_HEADER_CONTROLLER_KEY, controller)
	return controller
}

export function useShellHeaderController(): ShellHeaderController {
	const controller = inject(SHELL_HEADER_CONTROLLER_KEY, null)

	if (!controller) {
		throw new Error('Shell header controller is not available in the current app scope.')
	}

	return controller
}

export function bindShellHeaderContribution(
	controller: ShellHeaderController,
	contribution: MaybeRefOrGetter<ShellHeaderContribution>,
	source?: string,
): ShellHeaderLayerRegistration {
	const registration = controller.registerLayer(source)

	watchEffect(() => {
		registration.update(toValue(contribution))
	})

	onScopeDispose(() => {
		registration.remove()
	})

	return registration
}

export function useRegisterShellHeader(
	contribution: MaybeRefOrGetter<ShellHeaderContribution>,
	source?: string,
): ShellHeaderLayerRegistration {
	return bindShellHeaderContribution(useShellHeaderController(), contribution, source)
}
