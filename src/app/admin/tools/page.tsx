import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Role } from '@prisma/client'
import ResetTestPwButton from '@/components/admin/ResetTestPwButton'

export default async function AdminToolsPage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const isAdmin = roles.includes('admin' as Role)
	if (!isAdmin) return null

	return (
		<div className="max-w-3xl mx-auto p-4 space-y-4">
			<h1 className="text-2xl lg:text-3xl font-semibold">管理工具</h1>
			<div className="border rounded p-4 space-y-2">
				<div className="text-sm text-gray-700">重設測試帳號密碼（僅限 test@gmail.com、test2@gmail.com）</div>
				<ResetTestPwButton />
			</div>
		</div>
	)
}


