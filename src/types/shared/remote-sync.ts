export type RemoteDbProfileSource = 'manual' | 'import'

export type RemoteDbProfile = {
	id: string
	name: string
	source: RemoteDbProfileSource
	createdAt: string
	updatedAt: string
}

export type RemoteSyncSettings = {
	profiles: RemoteDbProfile[]
	activeProfileId: string | null
}

export type RemoteDbProfileInput = {
	name: string
	url: string
}
