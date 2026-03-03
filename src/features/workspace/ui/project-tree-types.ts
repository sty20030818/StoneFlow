export type ProjectTreeItem = {
	id: string
	parentId: string | null
	label: string
	icon: string
	iconClass: string
	rank: number
	createdAt: number
	children?: ProjectTreeItem[]
}
