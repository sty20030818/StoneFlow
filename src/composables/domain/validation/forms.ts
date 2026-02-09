import { z } from 'zod'

const requiredTrimmed = (label: string) => z.string().trim().min(1, `${label}不能为空`)

export const postgresUrlSchema = z
	.string()
	.trim()
	.refine(
		(value) => value.startsWith('postgres://') || value.startsWith('postgresql://'),
		'数据库地址必须以 postgres:// 或 postgresql:// 开头',
	)

export const remoteProfileSchema = z.object({
	name: requiredTrimmed('名称'),
	url: postgresUrlSchema,
})

export const remoteImportItemSchema = z.object({
	name: requiredTrimmed('名称'),
	url: postgresUrlSchema,
})

export const remoteImportListSchema = z
	.unknown()
	.refine((value) => Array.isArray(value), '导入内容必须是 JSON 数组')
	.pipe(z.array(remoteImportItemSchema).min(1, '未找到合法的 name/url 记录'))

export const taskSubmitSchema = z.object({
	title: requiredTrimmed('任务标题'),
})

export const projectSubmitSchema = z.object({
	title: requiredTrimmed('项目标题'),
})

export const noteSubmitSchema = z.object({
	title: requiredTrimmed('标题'),
})

export const snippetSubmitSchema = z.object({
	title: requiredTrimmed('标题'),
})

export const vaultSubmitSchema = z.object({
	name: requiredTrimmed('名称'),
	value: requiredTrimmed('值'),
})

export const diarySubmitSchema = z.object({
	title: requiredTrimmed('标题'),
})
