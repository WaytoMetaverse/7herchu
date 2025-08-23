import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'

export default async function MenuManagePage() {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('menu_manager')
	if (!canManage) redirect('/hall')

	// 取得所有活動及其餐點設定
	const events = await prisma.event.findMany({
		include: {
			eventMenu: true,
			registrations: {
				select: { id: true }
			}
		},
		orderBy: { startAt: 'desc' }
	})





	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">活動餐點管理</h1>
				<Button as={Link} href="/group" variant="ghost">返回小組管理</Button>
			</div>

			<p className="text-gray-600">管理所有活動的餐點設定，方便講師預約時判斷餐點。</p>

			{/* 活動列表 */}
			<div className="space-y-4">
				{events.map(event => (
					<div key={event.id} className="bg-white border rounded-lg p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1">
								<h3 className="text-lg font-medium">{event.title}</h3>
								<p className="text-sm text-gray-600">
									{new Date(event.startAt).toLocaleDateString('zh-TW')} {event.location}
								</p>
								<p className="text-sm text-gray-500">
									報名人數：{event.registrations.length} 人
								</p>
							</div>
							<div className="flex items-center gap-2">
								{event.eventMenu?.hasMealService ? (
									<span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
										已設定餐點
									</span>
								) : (
									<span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
										未設定餐點
									</span>
								)}
								<Link
									href={`/admin/menus/${event.id}/edit`}
									className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
								>
									{event.eventMenu?.hasMealService ? '編輯餐點' : '設定餐點'}
								</Link>
							</div>
						</div>


					</div>
				))}
			</div>
		</div>
	)
}
