import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import MemberListClient from '@/components/admin/MemberListClient'
import MemberInvitation from '@/components/admin/MemberInvitation'
import { revalidatePath } from 'next/cache'

export default async function MemberListPage() {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin')

	// 取得所有成員（包含停用的）
	const allMembers = await prisma.user.findMany({
		include: {
			memberProfile: true
		},
		orderBy: { createdAt: 'asc' }
	})

	// 停用成員
	async function deactivateMember(formData: FormData) {
		'use server'
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		if (!roles.includes('admin')) return
		const userId = String(formData.get('userId'))
		if (!userId) return
		
		await prisma.user.update({
			where: { id: userId },
			data: { isActive: false }
		})
		revalidatePath('/admin/member-list')
	}

	// 啟用成員
	async function activateMember(formData: FormData) {
		'use server'
		const session = await getServerSession(authOptions)
		const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
		if (!roles.includes('admin')) return
		const userId = String(formData.get('userId'))
		if (!userId) return
		
		await prisma.user.update({
			where: { id: userId },
			data: { isActive: true }
		})
		revalidatePath('/admin/member-list')
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">成員管理</h1>
				<Button as={Link} href="/group" variant="outline">返回小組管理</Button>
			</div>

			{/* 描述 */}
			<div className="bg-blue-50 p-4 rounded-lg">
				<p className="text-sm text-blue-800">管理組織成員的基本資料、啟用狀態，以及邀請新成員加入。</p>
			</div>

			{/* 按鈕區（非 admin 不顯示，保持空白不調整版位） */}
			<div className="flex items-center gap-3">
				{isAdmin ? <Button as={Link} href="/admin/permissions" variant="outline">權限管理</Button> : null}
				{isAdmin ? <MemberInvitation /> : null}
			</div>

			{/* 成員列表 */}
			<MemberListClient 
				members={allMembers.map(m => ({
					id: m.id,
					name: m.name || '',
					nickname: m.nickname || '',
					email: m.email,
					phone: m.phone || '',
					isActive: m.isActive,
					memberType: m.memberProfile?.memberType || 'SINGLE',
					roles: [], // 角色信息將在權限管理頁面處理
					occupation: m.memberProfile?.occupation || '',
					companyName: m.memberProfile?.companyName || '',
					workDescription: m.memberProfile?.workDescription || ''
				}))}
				deactivateMember={deactivateMember}
				activateMember={activateMember}
				canEdit={isAdmin}
			/>
		</div>
	)
}
