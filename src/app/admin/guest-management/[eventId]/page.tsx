import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Role } from '@prisma/client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { revalidatePath } from 'next/cache'

export const metadata = {
	title: '來賓管理',
	themeColor: '#ffffff',
	viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default async function GuestManagementPage({ params }: { params: Promise<{ eventId: string }> }) {
	const { eventId } = await params
	
	const session = await getServerSession(authOptions)
	if (!session?.user?.email) redirect('/auth/signin')

	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('event_manager')

	if (!canManage) {
		redirect('/hall') // 沒有權限則重導向到活動大廳
	}

	const event = await prisma.event.findUnique({ where: { id: eventId } })
	if (!event) notFound()

	// 取得該活動的所有來賓報名記錄
	const guests = await prisma.registration.findMany({
		where: { 
			eventId,
			role: 'GUEST'
		},
		orderBy: { createdAt: 'asc' }
	})

	// 取得活動餐點設定
	const eventMenu = await prisma.eventMenu.findUnique({
		where: { eventId }
	})

	// 刪除來賓報名記錄
	async function deleteGuest(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return

		await prisma.registration.delete({
			where: { id: registrationId }
		})

		revalidatePath(`/admin/guest-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">來賓管理</h1>
					<div className="text-gray-600 mt-1">
						<div className="font-medium">{event.title}</div>
						<div className="text-sm">
							{format(event.startAt, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
						</div>
						<div className="text-sm">{event.location}</div>
					</div>
				</div>
				<Button as={Link} href={`/hall/${eventId}`} variant="outline">
					返回活動詳情
				</Button>
			</div>

			{/* 統計資訊 */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-green-50 p-4 rounded-lg">
					<div className="text-2xl font-bold text-green-600">{guests.length}</div>
					<div className="text-sm text-green-700">來賓總數</div>
				</div>
				<div className="bg-blue-50 p-4 rounded-lg">
					<div className="text-2xl font-bold text-blue-600">
						{guests.filter(g => g.checkedInAt != null).length}
					</div>
					<div className="text-sm text-blue-700">已簽到來賓</div>
				</div>
			</div>

			{/* 來賓列表 */}
			<div className="bg-white rounded-lg shadow">
				<div className="p-4 border-b">
					<h2 className="text-lg font-medium">來賓列表（{guests.length}）</h2>
				</div>
				<div className="p-4">
					{guests.length === 0 ? (
						<div className="text-gray-500 text-center py-8">尚無來賓報名</div>
					) : (
						<div className="space-y-3">
							{guests.map(guest => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (guest.mealCode) {
										mealInfo = ` · ${guest.mealCode}餐`
									} else {
										mealInfo = ' · 待分配'
									}
								} else {
									if (guest.diet === 'veg') {
										mealInfo = ' · 素食'
									} else {
										const restrictions = []
										if (guest.noBeef) restrictions.push('不吃牛')
										if (guest.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` · 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' · 葷食'
										}
									}
								}

								return (
									<div key={guest.id} className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex-1">
											<div className="font-medium">
												{[guest.name, guest.companyName, guest.industry, guest.bniChapter].filter(Boolean).join(' · ')}{mealInfo}
											</div>
											<div className="text-sm text-gray-600">
												手機：{guest.phone} · 邀請人：{guest.invitedBy}
											</div>
											<div className="text-xs text-gray-500">
												報名時間：{format(guest.createdAt, 'MM/dd HH:mm')}
												{guest.checkedInAt && (
													<span> · 簽到時間：{format(guest.checkedInAt, 'MM/dd HH:mm')}</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<form action={deleteGuest}>
												<input type="hidden" name="registrationId" value={guest.id} />
												<Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700">
													刪除
												</Button>
											</form>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</div>

			{/* 操作說明 */}
			<div className="bg-blue-50 p-4 rounded-lg">
				<h3 className="font-medium text-blue-800 mb-2">管理說明</h3>
				<ul className="text-sm text-blue-700 space-y-1">
					<li>• 來賓報名後無法自行取消，只能由管理員刪除</li>
					<li>• 刪除來賓記錄會同時移除其報名和簽到資訊</li>
					<li>• 來賓的餐點選擇會根據活動設定自動顯示</li>
				</ul>
			</div>
		</div>
	)
}
