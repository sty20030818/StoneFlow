import { tauriInvoke } from '@/infra/tauri/invoke'
import { invalidateWorkspaceTaskAndProjectQueries } from '@/features/workspace'

export async function testRemoteSyncConnection(databaseUrl: string) {
	await tauriInvoke('test_neon_connection', { args: { databaseUrl } })
}

export async function invalidateAfterRemoteSync(options?: { refreshWorkspace?: boolean }) {
	if (!options?.refreshWorkspace) return
	await invalidateWorkspaceTaskAndProjectQueries()
}
