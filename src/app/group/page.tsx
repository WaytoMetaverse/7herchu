import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Role } from '@prisma/client'

export default async function GroupHomePage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin' as Role)
	const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, include: { memberProfile: true } })
	return (
		<div className="max-w-4xl mx-auto p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl lg:text-3xl font-semibold">成員名單</h1>
				{isAdmin ? <Link href="/admin/members" className="text-sm text-blue-600 underline">權限管理</Link> : null}
			</div>
			<div className="space-y-2">
				{users.map(u => (
					<div key={u.id} className="border rounded p-3 text-sm">
						<div className="font-medium">{u.name ?? '(未命名)'}{u.memberProfile?.occupation ? ` · ${u.memberProfile.occupation}` : ''}</div>
						<div className="text-gray-700">{u.memberProfile?.companyName ?? '-'}</div>
						<div className="text-gray-600">{u.memberProfile?.workDescription ?? '-'}</div>
					</div>
				))}
			</div>
		</div>
	)
}


