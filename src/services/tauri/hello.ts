import { tauriInvoke } from './invoke'

export async function hello(name?: string): Promise<string> {
	return await tauriInvoke<string>('hello', { name })
}
