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

	// 計算單次成員報名次數
	async function getSingleMemberRegistrationCount(userId: string, month: string) {
		const startDate = new Date(`${month}-01`)
		const endDate = new Date(startDate)
		endDate.setMonth(endDate.getMonth() + 1)

		const count = await prisma.registration.count({
			where: {
				userId,
				status: 'REGISTERED',  // 只計算已報名狀態
				event: {
					type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },  // 只計算這些活動類型
					startAt: { gte: startDate, lt: endDate }
				}
			}
		})
		return count
	}

	// 預計算所有成員各月份報名次數
	const memberRegistrationCounts = new Map<string, Map<string, number>>()
	for (const member of members) {
		const memberCounts = new Map<string, number>()
		for (const month of months) {
			const count = await getSingleMemberRegistrationCount(member.id, month)
			memberCounts.set(month, count)
		}
		memberRegistrationCounts.set(member.id, memberCounts)
	}

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

		// 獲取用戶資訊
		const user = await prisma.user.findUnique({ where: { id: userId } })
		if (!user) return

		const amount = 180 * currentMonthEventCount // 固定成員月費計算
		const amountCents = amount * 100 // 轉換為分

		// 更新月費記錄
		await prisma.memberMonthlyPayment.upsert({
			where: { userId_month: { userId, month } },
			create: {
				userId,
				month,
				isPaid: true,
				amount: amountCents,
				paidAt: new Date()
			},
			update: {
				isPaid: true,
				paidAt: new Date()
			}
		})

		// 確保財務分類存在
		let category = await prisma.financeCategory.findFirst({ 
			where: { name: '組聚收入' } 
		})
		if (!category) {
			category = await prisma.financeCategory.create({
				data: { 
					name: '組聚收入', 
					type: 'INCOME', 
					system: true 
				}
			})
		}

		// 新增財務交易記錄
		await prisma.financeTransaction.create({
			data: {
				date: new Date(), // 點擊當日的日期
				type: 'INCOME',
				amountCents: amountCents,
				counterparty: user.name || '未命名',
				note: `${month} 固定成員月費 (${currentMonthEventCount}次活動 × $180)`,
				categoryId: category.id
			}
		})

		// 同步更新該成員當月所有活動的繳費狀態
		const startDate = new Date(`${month}-01`)
		const endDate = new Date(startDate)
		endDate.setMonth(endDate.getMonth() + 1)

		await prisma.registration.updateMany({
			where: {
				userId: userId,
				status: 'REGISTERED',
				event: {
					type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },
					startAt: { gte: startDate, lt: endDate }
				}
			},
			data: { paymentStatus: 'PAID' }
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
										const registrationCount = memberRegistrationCounts.get(member.id)?.get(month) || 0
										
										if (isFixed) {
											// 固定成員：顯示月費繳費狀態
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
											// 單次成員：顯示報名次數和繳費功能
											return (
												<td key={month} className="px-3 py-3 text-center text-gray-600">
													<div className="space-y-2">
														<div>報名 {registrationCount} 次</div>
														{payment?.isPaid ? (
															<div className="text-xs text-green-600">
																已繳月費 ${(payment.amount || 0) / 100}
															</div>
														) : registrationCount > 0 ? (
															<form action={async (formData: FormData) => {
																'use server'
																const userId = String(formData.get('userId'))
																const month = String(formData.get('month'))
																const inputCount = Number(formData.get('inputCount'))
																if (!userId || !month || !inputCount) return

																// 檢查是否已經繳費過
																const existingPayment = await prisma.memberMonthlyPayment.findUnique({
																	where: { userId_month: { userId, month } }
																})
																if (existingPayment?.isPaid) return

																// 獲取用戶資訊
																const user = await prisma.user.findUnique({ where: { id: userId } })
																if (!user) return

																const amount = 220 * inputCount // 單次成員：220 × 次數
																const amountCents = amount * 100

																// 更新月費記錄
																const monthlyPayment = await prisma.memberMonthlyPayment.upsert({
																	where: { userId_month: { userId, month } },
																	create: {
																		userId,
																		month,
																		isPaid: true,
																		amount: amountCents,
																		paidAt: new Date()
																	},
																	update: {
																		isPaid: true,
																		amount: amountCents,
																		paidAt: new Date()
																	}
																})

																// 確保財務分類存在
																let category = await prisma.financeCategory.findFirst({
																	where: { name: '組聚收入' }
																})
																if (!category) {
																	category = await prisma.financeCategory.create({
																		data: {
																			name: '組聚收入',
																			type: 'INCOME',
																			system: true
																		}
																	})
																}

																// 新增財務交易記錄
																await prisma.financeTransaction.create({
																	data: {
																		date: new Date(),
																		type: 'INCOME',
																		amountCents: amountCents,
																		counterparty: user.name || '未命名',
																		note: `${month} 單次成員繳費 (${inputCount}次活動 × $220)`,
																		categoryId: category.id,
																		monthlyPaymentId: monthlyPayment.id
																	}
																})

																// 同步更新該成員當月所有活動的繳費狀態
																const startDate = new Date(`${month}-01`)
																const endDate = new Date(startDate)
																endDate.setMonth(endDate.getMonth() + 1)

																await prisma.registration.updateMany({
																	where: {
																		userId: userId,
																		status: 'REGISTERED',
																		event: {
																			type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },
																			startAt: { gte: startDate, lt: endDate }
																		}
																	},
																	data: { paymentStatus: 'PAID' }
																})

																revalidatePath('/admin/members')
															}} className="inline space-y-1">
																<input type="hidden" name="userId" value={member.id} />
																<input type="hidden" name="month" value={month} />
																<div className="flex items-center gap-1">
																	<input 
																		type="number" 
																		name="inputCount" 
																		min="1" 
																		max={registrationCount}
																		defaultValue={registrationCount}
																		className="w-12 text-xs px-1 py-0.5 border rounded text-center"
																		required
																	/>
																	<span className="text-xs">次</span>
																</div>
																<button 
																	type="submit"
																	className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded"
																>
																	繳費 $220/次
																</button>
															</form>
														) : (
															<div className="text-xs text-gray-400">無報名記錄</div>
														)}
													</div>
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