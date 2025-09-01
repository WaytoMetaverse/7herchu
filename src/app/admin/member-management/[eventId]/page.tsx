import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { Role } from '@prisma/client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { getDisplayName } from '@/lib/displayName'
import { revalidatePath } from 'next/cache'

export const metadata = {
	title: '成員管理',
	themeColor: '#ffffff',
	viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default async function MemberManagementPage({ params }: { params: Promise<{ eventId: string }> }) {
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

	// 取得該活動的所有內部成員報名記錄
	const registrations = await prisma.registration.findMany({
		where: { 
			eventId,
			role: 'MEMBER'
		},
		orderBy: { createdAt: 'asc' },
		include: { 
			user: { 
				select: { 
					name: true, 
					nickname: true,
					email: true,
					phone: true
				} 
			} 
		}
	})

	// 取得活動餐點設定
	const eventMenu = await prisma.eventMenu.findUnique({
		where: { eventId }
	})

	// 分離不同狀態的成員
	const registeredMembers = registrations.filter(r => r.status === 'REGISTERED')
	const leftMembers = registrations.filter(r => r.status === 'LEAVE')

	// 刪除成員報名記錄
	async function deleteRegistration(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		if (!registrationId) return

		await prisma.registration.delete({
			where: { id: registrationId }
		})

		revalidatePath(`/admin/member-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	// 修改成員狀態（報名/請假）
	async function toggleRegistrationStatus(formData: FormData) {
		'use server'
		const registrationId = String(formData.get('registrationId'))
		const newStatus = String(formData.get('newStatus'))
		if (!registrationId || !newStatus) return

		await prisma.registration.update({
			where: { id: registrationId },
			data: { status: newStatus as 'REGISTERED' | 'LEAVE' }
		})

		revalidatePath(`/admin/member-management/${eventId}`)
		revalidatePath(`/hall/${eventId}`)
	}

	return (
		<div className="max-w-4xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">成員管理</h1>
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
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-blue-50 p-4 rounded-lg">
					<div className="text-2xl font-bold text-blue-600">{registeredMembers.length}</div>
					<div className="text-sm text-blue-700">已報名成員</div>
				</div>
				<div className="bg-yellow-50 p-4 rounded-lg">
					<div className="text-2xl font-bold text-yellow-600">{leftMembers.length}</div>
					<div className="text-sm text-yellow-700">請假成員</div>
				</div>
				<div className="bg-gray-50 p-4 rounded-lg">
					<div className="text-2xl font-bold text-gray-600">{registrations.length}</div>
					<div className="text-sm text-gray-700">總成員數</div>
				</div>
			</div>

			{/* 已報名成員列表 */}
			<div className="bg-white rounded-lg shadow">
				<div className="p-4 border-b">
					<h2 className="text-lg font-medium">已報名成員（{registeredMembers.length}）</h2>
				</div>
				<div className="p-4">
					{registeredMembers.length === 0 ? (
						<div className="text-gray-500 text-center py-8">尚無成員報名</div>
					) : (
						<div className="space-y-3">
							{registeredMembers.map(reg => {
								let mealInfo = ''
								if (eventMenu?.hasMealService) {
									if (reg.mealCode) {
										mealInfo = ` - ${reg.mealCode}餐`
									} else {
										mealInfo = ' - 待分配'
									}
								} else {
									if (reg.diet === 'veg') {
										mealInfo = ' - 素食'
									} else {
										const restrictions = []
										if (reg.noBeef) restrictions.push('不吃牛')
										if (reg.noPork) restrictions.push('不吃豬')
										if (restrictions.length > 0) {
											mealInfo = ` - 葷食（${restrictions.join('、')}）`
										} else {
											mealInfo = ' - 葷食'
										}
									}
								}

								return (
									<div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex-1">
											<div className="font-medium">
												{getDisplayName(reg.user) || reg.name || '-'}{mealInfo}
											</div>
											<div className="text-sm text-gray-600">
												{reg.user?.email} · {reg.phone}
											</div>
											<div className="text-xs text-gray-500">
												報名時間：{format(reg.createdAt, 'MM/dd HH:mm')}
												{reg.checkedInAt && (
													<span> · 簽到時間：{format(reg.checkedInAt, 'MM/dd HH:mm')}</span>
												)}
											</div>
										</div>
										<div className="flex items-center gap-2">
											<form action={toggleRegistrationStatus}>
												<input type="hidden" name="registrationId" value={reg.id} />
												<input type="hidden" name="newStatus" value="LEAVE" />
												<Button type="submit" variant="outline" size="sm">
													設為請假
												</Button>
											</form>
											<form action={deleteRegistration}>
												<input type="hidden" name="registrationId" value={reg.id} />
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

			{/* 請假成員列表 */}
			{leftMembers.length > 0 && (
				<div className="bg-white rounded-lg shadow">
					<div className="p-4 border-b">
						<h2 className="text-lg font-medium">請假成員（{leftMembers.length}）</h2>
					</div>
					<div className="p-4">
						<div className="space-y-3">
							{leftMembers.map(reg => (
								<div key={reg.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
									<div className="flex-1">
										<div className="font-medium">
											{getDisplayName(reg.user) || reg.name || '-'}
										</div>
										<div className="text-sm text-gray-600">
											{reg.user?.email} · {reg.phone}
										</div>
										<div className="text-xs text-gray-500">
											請假時間：{format(reg.createdAt, 'MM/dd HH:mm')}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<form action={toggleRegistrationStatus}>
											<input type="hidden" name="registrationId" value={reg.id} />
											<input type="hidden" name="newStatus" value="REGISTERED" />
											<Button type="submit" variant="outline" size="sm">
												恢復報名
											</Button>
										</form>
										<form action={deleteRegistration}>
											<input type="hidden" name="registrationId" value={reg.id} />
											<Button type="submit" variant="outline" size="sm" className="text-red-600 hover:text-red-700">
												刪除
											</Button>
										</form>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
