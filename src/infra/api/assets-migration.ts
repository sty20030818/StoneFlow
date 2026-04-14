import { tauriInvoke } from '@/infra/tauri/invoke'
import { ensureVaultUnlocked } from '@/infra/api/vault'
import { encryptVaultValue } from '@/infra/crypto/vault-crypto'

import type { DiaryEntryDto } from '@/infra/api/diary'
import type { NoteDto } from '@/infra/api/notes'
import type { SnippetDto } from '@/infra/api/snippets'
import type { VaultEntryDto } from '@/infra/api/vault'

type AssetsMigrationStatusDto = {
	done: boolean
	migratedAt: number | null
}

const LEGACY_STORAGE_KEYS = {
	snippets: 'stoneflow_snippets',
	notes: 'stoneflow_notes',
	diary: 'stoneflow_diary',
	vault: 'stoneflow_vault',
} as const

function readLegacyJson(key: string): unknown[] {
	if (typeof window === 'undefined') return []
	const raw = window.localStorage.getItem(key)
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

function normalizeLegacySnippet(input: Record<string, unknown>): SnippetDto {
	return {
		id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
		title: typeof input.title === 'string' ? input.title : '',
		language: typeof input.language === 'string' ? input.language : 'plaintext',
		content: typeof input.content === 'string' ? input.content : '',
		description: typeof input.description === 'string' ? input.description : null,
		folder: typeof input.folder === 'string' ? input.folder : null,
		tags: Array.isArray(input.tags) ? input.tags.filter((item): item is string => typeof item === 'string') : [],
		favorite: Boolean(input.favorite),
		linkedTaskId:
			typeof input.linkedTaskId === 'string'
				? input.linkedTaskId
				: typeof input.linked_task_id === 'string'
					? input.linked_task_id
					: null,
		linkedProjectId:
			typeof input.linkedProjectId === 'string'
				? input.linkedProjectId
				: typeof input.linked_project_id === 'string'
					? input.linked_project_id
					: null,
		syncState: typeof input.syncState === 'string' ? input.syncState : 'local',
		createdAt:
			typeof input.createdAt === 'number'
				? input.createdAt
				: typeof input.created_at === 'number'
					? input.created_at
					: Date.now(),
		updatedAt:
			typeof input.updatedAt === 'number'
				? input.updatedAt
				: typeof input.updated_at === 'number'
					? input.updated_at
					: Date.now(),
	}
}

function normalizeLegacyNote(input: Record<string, unknown>): NoteDto {
	return {
		id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
		title: typeof input.title === 'string' ? input.title : '',
		content: typeof input.content === 'string' ? input.content : '',
		excerpt: typeof input.excerpt === 'string' ? input.excerpt : null,
		tags: Array.isArray(input.tags) ? input.tags.filter((item): item is string => typeof item === 'string') : [],
		favorite: Boolean(input.favorite),
		linkedProjectId:
			typeof input.linkedProjectId === 'string'
				? input.linkedProjectId
				: typeof input.linked_project_id === 'string'
					? input.linked_project_id
					: null,
		linkedTaskId:
			typeof input.linkedTaskId === 'string'
				? input.linkedTaskId
				: typeof input.linked_task_id === 'string'
					? input.linked_task_id
					: null,
		syncState: typeof input.syncState === 'string' ? input.syncState : 'local',
		createdAt:
			typeof input.createdAt === 'number'
				? input.createdAt
				: typeof input.created_at === 'number'
					? input.created_at
					: Date.now(),
		updatedAt:
			typeof input.updatedAt === 'number'
				? input.updatedAt
				: typeof input.updated_at === 'number'
					? input.updated_at
					: Date.now(),
	}
}

function normalizeLegacyDiaryEntry(input: Record<string, unknown>): DiaryEntryDto {
	return {
		id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
		date: typeof input.date === 'string' ? input.date : new Date().toISOString().slice(0, 10),
		title: typeof input.title === 'string' ? input.title : '',
		subtitle: typeof input.subtitle === 'string' ? input.subtitle : null,
		content: typeof input.content === 'string' ? input.content : '',
		tags: Array.isArray(input.tags) ? input.tags.filter((item): item is string => typeof item === 'string') : [],
		favorite: Boolean(input.favorite),
		linkedTaskIds: Array.isArray(input.linkedTaskIds)
			? input.linkedTaskIds.filter((item): item is string => typeof item === 'string')
			: Array.isArray(input.linked_task_ids)
				? input.linked_task_ids.filter((item): item is string => typeof item === 'string')
				: [],
		linkedProjectId:
			typeof input.linkedProjectId === 'string'
				? input.linkedProjectId
				: typeof input.linked_project_id === 'string'
					? input.linked_project_id
					: null,
		syncState: typeof input.syncState === 'string' ? input.syncState : 'local',
		createdAt:
			typeof input.createdAt === 'number'
				? input.createdAt
				: typeof input.created_at === 'number'
					? input.created_at
					: Date.now(),
		updatedAt:
			typeof input.updatedAt === 'number'
				? input.updatedAt
				: typeof input.updated_at === 'number'
					? input.updated_at
					: Date.now(),
	}
}

function normalizeLegacyVaultEntry(input: Record<string, unknown>): VaultEntryDto {
	return {
		id: typeof input.id === 'string' ? input.id : crypto.randomUUID(),
		name: typeof input.name === 'string' ? input.name : '',
		type: (typeof input.type === 'string' ? input.type : 'config') as VaultEntryDto['type'],
		environment: typeof input.environment === 'string' ? input.environment : null,
		value: typeof input.value === 'string' ? input.value : '',
		folder: typeof input.folder === 'string' ? input.folder : null,
		note: typeof input.note === 'string' ? input.note : null,
		tags: Array.isArray(input.tags) ? input.tags.filter((item): item is string => typeof item === 'string') : [],
		favorite: Boolean(input.favorite),
		syncState: typeof input.syncState === 'string' ? input.syncState : 'local',
		createdAt:
			typeof input.createdAt === 'number'
				? input.createdAt
				: typeof input.created_at === 'number'
					? input.created_at
					: Date.now(),
		updatedAt:
			typeof input.updatedAt === 'number'
				? input.updatedAt
				: typeof input.updated_at === 'number'
					? input.updated_at
					: Date.now(),
	}
}

export async function initializeAssetsMigration(): Promise<void> {
	if (typeof window === 'undefined') return

	const status = await tauriInvoke<AssetsMigrationStatusDto>('get_assets_migration_status')
	if (status.done) return

	const snippets = readLegacyJson(LEGACY_STORAGE_KEYS.snippets)
		.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
		.map(normalizeLegacySnippet)
	const notes = readLegacyJson(LEGACY_STORAGE_KEYS.notes)
		.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
		.map(normalizeLegacyNote)
	const diaryEntries = readLegacyJson(LEGACY_STORAGE_KEYS.diary)
		.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
		.map(normalizeLegacyDiaryEntry)
	const vaultEntries = readLegacyJson(LEGACY_STORAGE_KEYS.vault)
		.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
		.map(normalizeLegacyVaultEntry)
	const vaultMasterKey = vaultEntries.length > 0 ? await ensureVaultUnlocked() : null
	const encryptedVaultEntries = vaultMasterKey
		? await Promise.all(
				vaultEntries.map(async (entry) => ({
					...entry,
					value: await encryptVaultValue(entry.value, vaultMasterKey),
					syncState: 'local',
				})),
			)
		: vaultEntries

	await tauriInvoke<AssetsMigrationStatusDto>('import_legacy_assets', {
		args: {
			snippets,
			notes,
			diaryEntries,
			vaultEntries: encryptedVaultEntries,
		},
	})
}
