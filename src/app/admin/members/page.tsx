import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MemberType } from '@prisma/client'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import CopyButton from '@/components/admin/CopyButton'
import MemberTypeSelect from '@/components/admin/MemberTypeSelect'
import MonthSelector from '@/components/admin/MonthSelector'

export default async function MembersManagePage({ 
	searchParams 
}: { 
	searchParams?: Promise<{ month?: string }> 
}) {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('finance_manager')
	if (!canManage) redirect('/hall')

	const sp = searchParams ? await searchParams : undefined
	const selectedMonth = sp?.month || new Date().toISOString().slice(0, 7)

	// 取得所有成員及其類型
	const members = await prisma.user.findMany({
		where: {
			memberProfile: { isNot: null }
		},
		include: {
			memberProfile: true,
			monthlyPayments: {
				where: {
					month: {
						// 取得最近6個月的記錄
						gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7)
					}
				},
				orderBy: { month: 'desc' }
			}
		},
		orderBy: { name: 'asc' }
	})

	// 生成最近6個月的月份列表
	const months = Array.from({ length: 6 }, (_, i) => {
		const date = new Date()
		date.setMonth(date.getMonth() - i)
		return date.toISOString().slice(0, 7)
	})

	// 計算當月活動數量（簡報組聚 + 聯合組聚 + 封閉組聚）
	async function getMonthlyEventCount(month: string) {
		const startDate = new Date(`${month}-01`)
		const endDate = new Date(startDate)
		endDate.setMonth(endDate.getMonth() + 1)

		const count = await prisma.event.count({
			where: {
				type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },
				startAt: { gte: startDate, lt: endDate }
			}
		})
		return count
	}

	const currentMonthEventCount = await getMonthlyEventCount(selectedMonth)

	// 更新成員類型
	async function updateMemberType(formData: FormData) {
		'use server'
		const userId = String(formData.get('userId'))
		const memberType = String(formData.get('memberType')) as MemberType
		if (!userId || !memberType) return

		await prisma.memberProfile.update({
			where: { userId },
			data: { memberType }
		})
		revalidatePath('/admin/members')
	}

	// 標記月費已繳
	async function markPaid(formData: FormData) {
		'use server'
		const userId = String(formData.get('userId'))
		const month = String(formData.get('month'))
		if (!userId || !month) return

		const amount = 180 * currentMonthEventCount // 固定成員月費計算
		await prisma.memberMonthlyPayment.upsert({
			where: { userId_month: { userId, month } },
			create: {
				userId,
				month,
				isPaid: true,
				amount: amount * 100, // 轉換為分
				paidAt: new Date()
			},
			update: {
				isPaid: true,
				paidAt: new Date()
			}
		})
		revalidatePath('/admin/members')
	}

	// 生成繳費訊息
	const fixedMembers = members.filter(m => m.memberProfile?.memberType === 'FIXED')
	const unpaidFixedMembers = fixedMembers.filter(m => {
		const payment = m.monthlyPayments.find(p => p.month === selectedMonth)
		return !payment?.isPaid
	})

	const selectedDate = new Date(selectedMonth + '-01')
	const displayMonth = selectedDate.getMonth() + 1
	
	// 顯示暱稱，沒有暱稱則用姓名後兩字
	const getDisplayName = (member: typeof members[0]) => {
		if (member.nickname) return member.nickname
		const name = member.name || ''
		return name.length >= 2 ? name.slice(-2) : name
	}

	const paymentMessage = `請夥伴們幫忙繳交${displayMonth}月建築組聚費用
180乘以${currentMonthEventCount}=${180 * currentMonthEventCount}
未繳交:${unpaidFixedMembers.map(m => getDisplayName(m)).join('、')}`

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">成員管理</h1>
				<Button as={Link} href="/admin/finance" variant="outline">返回財務管理</Button>
			</div>

			{/* 月份選擇器 */}
			<MonthSelector currentMonth={selectedMonth} />

			{/* 繳費訊息產生器 */}
			<div className="bg-blue-50 p-4 rounded-lg">
				<h2 className="font-medium mb-2">繳費訊息（固定成員）</h2>
				<div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-line">
					{paymentMessage}
				</div>
				<div className="mt-2">
					<CopyButton text={paymentMessage}>複製訊息</CopyButton>
				</div>
			</div>

			{/* 成員列表 */}
			<div className="bg-white rounded-lg border overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left font-medium">姓名</th>
								<th className="px-4 py-3 text-left font-medium">類型</th>
								{months.map(month => (
									<th key={month} className="px-3 py-3 text-center font-medium min-w-20">
										{month.slice(5)}月
									</th>
								))}

							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{members.map(member => (
								<tr key={member.id}>
									<td className="px-4 py-3 font-medium">{getDisplayName(member)}</td>
									<td className="px-4 py-3">
										<MemberTypeSelect
											userId={member.id}
											defaultValue={member.memberProfile?.memberType || 'SINGLE'}
											updateMemberType={updateMemberType}
										/>
									</td>
									{months.map(month => {
										const payment = member.monthlyPayments.find(p => p.month === month)
										const isFixed = member.memberProfile?.memberType === 'FIXED'
										
										if (isFixed) {
											return (
												<td key={month} className="px-3 py-3 text-center">
													{payment?.isPaid ? (
														<span className="text-green-600 font-medium">已繳費</span>
													) : (
														<form action={markPaid} className="inline">
															<input type="hidden" name="userId" value={member.id} />
															<input type="hidden" name="month" value={month} />
															<button 
																type="submit"
																className="text-red-600 hover:text-red-800 text-xs"
															>
																未繳費
															</button>
														</form>
													)}
												</td>
											)
										} else {
											// 單次成員顯示參加次數
											return (
												<td key={month} className="px-3 py-3 text-center text-gray-600">
													0
												</td>
											)
										}
									})}

								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}