import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import PermissionsClient from '@/components/admin/PermissionsClient'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export default async function PermissionsPage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')
	if (!isAdmin) redirect('/hall')

	// 取得所有成員及其角色（包含沒有 memberProfile 的用戶）
	const members = await prisma.user.findMany({
		where: {
			isActive: true
		},
		select: {
			id: true,
			name: true,
			nickname: true,
			email: true,
			roles: true,
			memberProfile: {
				select: {
					memberType: true
				}
			}
		},
		orderBy: { name: 'asc' }
	})

	// 更新成員權限
	async function updatePermissions(formData: FormData) {
		'use server'
		const updates = JSON.parse(String(formData.get('updates') || '[]')) as Array<{
			userId: string
			roles: Role[]
		}>

		if (!Array.isArray(updates)) return

		// 批量更新所有成員的權限
		await prisma.$transaction(
			updates.map(update => 
				prisma.user.update({
					where: { id: update.userId },
					data: { roles: update.roles }
				})
			)
		)

		revalidatePath('/admin/permissions')
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">權限管理</h1>
				<div className="flex gap-2">
					<Button as={Link} href="/admin/member-list" variant="outline">成員名單</Button>
					<Button as={Link} href="/group" variant="ghost">返回小組管理</Button>
				</div>
			</div>

			{/* 權限說明 */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h2 className="font-medium mb-2">權限說明</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
					<div><strong>管理者</strong>：所有功能的完整權限</div>
					<div><strong>活動管理</strong>：新增/編輯活動、簽到管理</div>
					<div><strong>財務管理</strong>：財務記錄、成員繳費</div>
					<div><strong>菜單管理</strong>：月份菜單設定</div>
					<div><strong>簽到管理</strong>：活動簽到功能</div>
				</div>
			</div>

			{/* 權限管理表格 */}
			<PermissionsClient 
				members={members.map(m => ({
					id: m.id,
					name: m.name || '',
					nickname: m.nickname || '',
					email: m.email,
					roles: m.roles
				}))}
				updatePermissions={updatePermissions}
			/>
		</div>
	)
}
