export type VaultEntryType = 'api_key' | 'token' | 'password' | 'config'

export type VaultEntryDto = {
	id: string
	name: string
	type: VaultEntryType
	value: string
	folder: string | null
	note: string | null
	createdAt: number
	updatedAt: number
}

const STORAGE_KEY = 'stoneflow_vault'

/**
 * 临时实现：使用 localStorage 存储密钥（未加密，仅占位）。
 * 后续需迁移到后端加密存储。
 */
export async function listVaultEntries(): Promise<VaultEntryDto[]> {
	const raw = localStorage.getItem(STORAGE_KEY)
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw) as Partial<VaultEntryDto>[]
		return parsed.map((entry) => ({
			id: entry.id ?? '',
			name: entry.name ?? '',
			type: entry.type ?? 'config',
			value: entry.value ?? '',
			folder: entry.folder ?? null,
			note: entry.note ?? null,
			createdAt: entry.createdAt ?? (entry as { created_at?: number }).created_at ?? 0,
			updatedAt: entry.updatedAt ?? (entry as { updated_at?: number }).updated_at ?? 0,
		}))
	} catch {
		return []
	}
}

export async function createVaultEntry(data: {
	name: string
	type: VaultEntryType
	value: string
	folder?: string | null
	note?: string | null
}): Promise<VaultEntryDto> {
	const now = Date.now()
	const entry: VaultEntryDto = {
		id: `vault_${now}_${Math.random().toString(36).substring(2, 9)}`,
		name: data.name.trim(),
		type: data.type,
		value: data.value,
		folder: data.folder ?? null,
		note: data.note ?? null,
		createdAt: now,
		updatedAt: now,
	}

	const all = await listVaultEntries()
	all.push(entry)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
	return entry
}

export async function updateVaultEntry(id: string, patch: Partial<VaultEntryDto>): Promise<void> {
	const all = await listVaultEntries()
	const idx = all.findIndex((e) => e.id === id)
	if (idx < 0) throw new Error('Vault entry not found')
	all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() }
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export async function deleteVaultEntry(id: string): Promise<void> {
	const all = await listVaultEntries()
	const filtered = all.filter((e) => e.id !== id)
	localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
