import { inject, onScopeDispose, provide, toValue, watchEffect, type InjectionKey, type MaybeRefOrGetter } from 'vue'

import { createAppHeaderController } from './controller'
import type { AppHeaderContribution, AppHeaderController, AppHeaderLayerRegistration } from './types'

const APP_HEADER_CONTROLLER_KEY: InjectionKey<AppHeaderController> = Symbol('appHeaderController')

export function provideAppHeaderController(controller = createAppHeaderController()): AppHeaderController {
	provide(APP_HEADER_CONTROLLER_KEY, controller)
	return controller
}

export function useAppHeaderController(): AppHeaderController {
	const controller = inject(APP_HEADER_CONTROLLER_KEY, null)

	if (!controller) {
		throw new Error('App header controller is not available in the current app scope.')
	}

	return controller
}

export function bindAppHeaderContribution(
	controller: AppHeaderController,
	contribution: MaybeRefOrGetter<AppHeaderContribution>,
	source?: string,
): AppHeaderLayerRegistration {
	const registration = controller.registerLayer(source)

	watchEffect(() => {
		registration.update(toValue(contribution))
	})

	onScopeDispose(() => {
		registration.remove()
	})

	return registration
}

export function useRegisterAppHeader(
	contribution: MaybeRefOrGetter<AppHeaderContribution>,
	source?: string,
): AppHeaderLayerRegistration {
	return bindAppHeaderContribution(useAppHeaderController(), contribution, source)
}
