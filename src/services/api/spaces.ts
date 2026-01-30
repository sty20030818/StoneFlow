import { tauriInvoke } from '@/services/tauri/invoke'
import type { SpaceId } from '@/types/domain/space'

export type SpaceDto = {
	id: SpaceId
	name: string
	order: number
	created_at: number
	updated_at: number
}

/**
 * Space API（封装 Tauri command 名，页面不直接写字符串）。
 */
export async function listSpaces(): Promise<SpaceDto[]> {
	// Rust: commands/spaces.rs -> list_spaces
	return await tauriInvoke<SpaceDto[]>('list_spaces')
}
