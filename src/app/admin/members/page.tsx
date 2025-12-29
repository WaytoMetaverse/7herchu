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
import CancelPaymentButton from './CancelPaymentButton'
import CancelFixedPaymentButton from './CancelFixedPaymentButton'
import MarkPaidForm from '@/components/admin/MarkPaidForm'

export default async function MembersManagePage({ 
	searchParams 
}: { 
	searchParams?: Promise<{ month?: string }> 
}) {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/auth/signin')
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('finance_manager')
	
	// 一般成員可以查看，但不能操作

	const sp = searchParams ? await searchParams : undefined
	const selectedMonth = sp?.month || new Date().toISOString().slice(0, 7)

	// 取得所有活躍的已註冊使用者（不論是否有報名/是否已有 memberProfile）
	const members = await prisma.user.findMany({
		where: {
			isActive: true  // 只顯示活躍成員
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

	// 生成 6 個月視窗：當月為中心，顯示 -2、-1、0、+1、+2、+3（可跨年）
	const months: string[] = []
	{
		const now = new Date()
		const base = new Date(now.getFullYear(), now.getMonth(), 1)
		for (let offset = -2; offset <= 3; offset++) {
			const d = new Date(base)
			d.setMonth(d.getMonth() + offset)
			months.push(d.toISOString().slice(0, 7))
		}
	}

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

		await prisma.memberProfile.upsert({
			where: { userId },
			update: { memberType },
			create: { 
				userId, 
				memberType,
				active: true
			}
		})
		revalidatePath('/admin/members')
	}

	// 標記月費已繳（固定成員）
	async function markPaid(formData: FormData) {
	'use server'
		const userId = String(formData.get('userId'))
		const month = String(formData.get('month'))
		if (!userId || !month) return

		// 獲取用戶資訊
		const user = await prisma.user.findUnique({ where: { id: userId } })
		if (!user) return

		// 計算當月活動次數
		const startDate = new Date(`${month}-01`)
		const endDate = new Date(startDate)
		endDate.setMonth(endDate.getMonth() + 1)

		const currentMonthEventCount = await prisma.event.count({
			where: {
				type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },
				startAt: { gte: startDate, lt: endDate }
			}
		})

		const amount = 180 * currentMonthEventCount // 固定成員月費計算
		const amountCents = amount * 100 // 轉換為分

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

		// 檢查是否已經存在相同的財務交易記錄（防止重複提交）
		const existingTransaction = await prisma.financeTransaction.findFirst({
			where: {
				monthlyPaymentId: monthlyPayment.id,
				amountCents: amountCents,
				type: 'INCOME',
				categoryId: category.id
			}
		})

		// 只有不存在相同記錄時才創建新的財務交易記錄
		if (!existingTransaction) {
			await prisma.financeTransaction.create({
				data: {
					date: new Date(),
					type: 'INCOME',
					amountCents: amountCents,
					counterparty: user.name || '未命名',
					note: `${month} 固定成員月費 (${currentMonthEventCount}次活動 × $180)`,
					categoryId: category.id,
					monthlyPaymentId: monthlyPayment.id
				}
			})
		}

		// 同步更新該成員當月所有活動的繳費狀態
		// 使用上面已經計算的 startDate 和 endDate

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

	// 取消固定成員繳費
	async function cancelFixedPayment(formData: FormData) {
		'use server'
		const userId = String(formData.get('userId'))
		const month = String(formData.get('month'))
		if (!userId || !month) return

		// 找到該成員該月份的繳費記錄
		const monthlyPayment = await prisma.memberMonthlyPayment.findUnique({
			where: { userId_month: { userId, month } }
		})
		
		if (!monthlyPayment || !monthlyPayment.isPaid) return

		// 找到對應的財務交易記錄
		const transaction = await prisma.financeTransaction.findFirst({
			where: {
				monthlyPaymentId: monthlyPayment.id
			}
		})

		if (!transaction) return

		// 使用事務確保所有操作都成功
		await prisma.$transaction(async (tx) => {
			// 刪除財務交易記錄
			await tx.financeTransaction.delete({
				where: { id: transaction.id }
			})

			// 刪除月費記錄
			await tx.memberMonthlyPayment.delete({
				where: { id: monthlyPayment.id }
			})

			// 找到該次繳費對應的活動註冊記錄，將其改回 UNPAID
			const startDate = new Date(`${month}-01`)
			const endDate = new Date(startDate)
			endDate.setMonth(endDate.getMonth() + 1)

			await tx.registration.updateMany({
				where: {
					userId: userId,
					status: 'REGISTERED',
					paymentStatus: 'PAID',
					event: {
						type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },
						startAt: { gte: startDate, lt: endDate }
					}
				},
				data: { paymentStatus: 'UNPAID' }
			})
		})

		revalidatePath('/admin/members')
	}

	// 取消繳費（單次成員）
	async function cancelLastPayment(formData: FormData) {
		'use server'
		const userId = String(formData.get('userId'))
		const month = String(formData.get('month'))
		if (!userId || !month) return

		// 找到該成員該月份的繳費記錄
		const monthlyPayment = await prisma.memberMonthlyPayment.findUnique({
			where: { userId_month: { userId, month } }
		})
		
		if (!monthlyPayment || !monthlyPayment.isPaid) return

		// 找到最後一筆財務交易記錄（按創建時間降序）
		const lastTransaction = await prisma.financeTransaction.findFirst({
			where: {
				monthlyPaymentId: monthlyPayment.id
			},
			orderBy: { createdAt: 'desc' }
		})

		if (!lastTransaction) return

		// 計算回滾後的金額
		const currentAmount = monthlyPayment.amount || 0
		const rollbackAmount = currentAmount - lastTransaction.amountCents
		const rollbackCount = Math.round(lastTransaction.amountCents / 100 / 220)

		// 刪除最後一筆財務交易
		await prisma.financeTransaction.delete({
			where: { id: lastTransaction.id }
		})

		// 檢查是否還有其他財務交易記錄
		const remainingTransactions = await prisma.financeTransaction.count({
			where: {
				monthlyPaymentId: monthlyPayment.id
			}
		})

		if (rollbackAmount > 0) {
			// 更新月費記錄為新的金額，並根據是否還有其他交易來設定 isPaid
			await prisma.memberMonthlyPayment.update({
				where: { id: monthlyPayment.id },
				data: {
					amount: rollbackAmount,
					isPaid: remainingTransactions > 0, // 如果還有其他交易，則 isPaid 為 true
					paidAt: remainingTransactions > 0 ? new Date() : null
				}
			})
		} else {
			// 如果金額歸零，刪除月費記錄
			await prisma.memberMonthlyPayment.delete({
				where: { id: monthlyPayment.id }
			})
		}

		// 找到該次繳費對應的活動註冊記錄，將其改回 UNPAID
		const startDate = new Date(`${month}-01`)
		const endDate = new Date(startDate)
		endDate.setMonth(endDate.getMonth() + 1)

		// 找出該成員當月所有已繳費的活動，按時間倒序排序（最晚的優先取消）
		const paidRegistrations = await prisma.registration.findMany({
			where: {
				userId: userId,
				status: 'REGISTERED',
				paymentStatus: 'PAID',
				event: {
					type: { in: ['GENERAL', 'JOINT', 'CLOSED'] },
					startAt: { gte: startDate, lt: endDate }
				}
			},
			include: { event: true },
			orderBy: { event: { startAt: 'desc' } }
		})

		// 只取消對應次數的活動繳費狀態
		const registrationsToCancel = paidRegistrations.slice(0, rollbackCount)
		
		for (const registration of registrationsToCancel) {
			await prisma.registration.update({
				where: { id: registration.id },
				data: { paymentStatus: 'UNPAID' }
			})
		}

		revalidatePath('/admin/members')
	}

	// 生成繳費訊息
	const fixedMembers = members.filter(m => m.memberProfile?.memberType === 'FIXED')
	const unpaidFixedMembers = fixedMembers.filter(m => {
		const payment = m.monthlyPayments.find(p => p.month === selectedMonth)
		return !payment?.isPaid
	})

	const displayMonth = parseInt(selectedMonth.split('-')[1])
	
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
				<h1 className="text-2xl font-semibold truncate">成員管理</h1>
				<Button as={Link} href="/admin/finance" variant="outline" className="whitespace-nowrap">返回財務管理</Button>
			</div>

			{/* 提示訊息 */}
			{!canManage && (
				<div className="bg-blue-50 p-4 rounded-lg text-sm">
					<p className="text-blue-800">您可以查看成員類型和繳費狀態，但無法進行操作。如需修改，請聯繫財務管理員。</p>
				</div>
			)}

			{/* 繳費訊息產生器 - 所有人可見 */}
			<div className="bg-blue-50 p-4 rounded-lg text-xs sm:text-sm">
				<div className="flex items-center justify-between mb-2">
					<h2 className="font-medium">繳費訊息<br className="sm:hidden" />（固定成員）</h2>
					<MonthSelector currentMonth={selectedMonth} />
				</div>
				<div className="bg-white p-3 rounded border text-sm font-mono whitespace-pre-line">
					{paymentMessage}
				</div>
				<div className="mt-2">
					<CopyButton text={paymentMessage}>複製訊息</CopyButton>
				</div>
			</div>

			{/* 成員列表 */}
			<div className="bg-white rounded-lg border overflow-hidden text-xs sm:text-sm">
				<div className="overflow-x-auto">
					<table className="w-full text-xs sm:text-sm min-w-max">
						<thead className="bg-gray-50">
							<tr>
								<th className="sticky left-0 z-20 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3 text-left font-medium whitespace-nowrap text-xs sm:text-sm border-r">姓名</th>
								<th className="sticky left-[60px] sm:left-[80px] z-20 bg-gray-50 px-2 py-2 sm:px-4 sm:py-3 text-left font-medium whitespace-nowrap text-xs sm:text-sm border-r">類型</th>
								{months.map(month => {
									const monthNum = parseInt(month.slice(5))
									// 單數月用藍色，雙數月用灰色
									const headerBgColor = monthNum % 2 === 1 ? 'bg-blue-100' : 'bg-gray-50'
									return (
										<th key={month} className={`px-2 py-2 text-center font-medium min-w-16 whitespace-nowrap text-xs sm:text-sm ${headerBgColor}`}>{month.slice(5)}月</th>
									)
								})}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{members.map(member => (
								<tr key={member.id}>
									<td className="sticky left-0 z-10 bg-white px-2 py-2 sm:px-4 sm:py-3 font-medium sm:whitespace-nowrap text-xs sm:text-sm border-r max-w-[60px] sm:max-w-none break-words">{getDisplayName(member)}</td>
									<td className="sticky left-[60px] sm:left-[80px] z-10 bg-white px-2 py-2 sm:px-4 sm:py-3 whitespace-nowrap border-r">
										{canManage ? (
											<MemberTypeSelect
												userId={member.id}
												defaultValue={member.memberProfile?.memberType || 'SINGLE'}
												updateMemberType={updateMemberType}
											/>
										) : (
											<span className="text-xs sm:text-sm">
												{member.memberProfile?.memberType === 'FIXED' ? '固定' : '單次'}
											</span>
										)}
									</td>
									{months.map(month => {
										const payment = member.monthlyPayments.find(p => p.month === month)
										const isFixed = member.memberProfile?.memberType === 'FIXED'
										const registrationCount = memberRegistrationCounts.get(member.id)?.get(month) || 0
										const isJulyAugSep2025 = month === '2025-07' || month === '2025-08' || month === '2025-09'
										
										// 單數月用藍色，雙數月沒顏色
										const monthNum = parseInt(month.slice(5))
										const bgColor = monthNum % 2 === 1 ? 'bg-blue-50' : ''
										
										if (isFixed) {
											const isPaid = Boolean(payment?.isPaid) || isJulyAugSep2025
											return (
												<td key={month} className={`px-2 py-2 text-center ${bgColor}`}>
													{isPaid ? (
														<div className="flex flex-col items-center gap-0.5">
															<span className="text-green-600 font-medium text-xs">已繳費</span>
															{canManage && payment?.isPaid && !isJulyAugSep2025 && (
																<CancelFixedPaymentButton
																	userId={member.id}
																	month={month}
																	amount={payment.amount || 0}
																	activityCount={currentMonthEventCount}
																	onCancel={cancelFixedPayment}
																/>
															)}
														</div>
													) : (
														canManage ? (
															<MarkPaidForm 
																action={markPaid}
																userId={member.id}
																month={month}
															/>
														) : (
															<span className="text-xs text-red-600 font-medium">未繳費</span>
														)
													)}
												</td>
											)
										} else {
											if (isJulyAugSep2025) {
												return (
													<td key={month} className={`px-2 py-2 text-center text-gray-600 ${bgColor}`}>
														<div className="space-y-0.5 text-xs">
															<div>報名 {registrationCount} 次</div>
															<span className="text-green-600 font-medium">已繳費</span>
														</div>
													</td>
												)
											}
											
											// 單次成員顯示邏輯
											const currentPaidAmount = payment?.amount || 0
											const currentPaidCount = Math.round(currentPaidAmount / 100 / 220)
											const remainingCount = registrationCount - currentPaidCount
											
											return (
												<td key={month} className={`px-2 py-2 text-center text-gray-600 ${bgColor}`}>
													<div className="space-y-0.5 text-xs">
														<div>報名 {registrationCount} 次</div>
														{payment?.isPaid && canManage ? (
															<CancelPaymentButton
																userId={member.id}
																month={month}
																amount={payment.amount || 0}
																activityCount={Math.round((payment.amount || 0) / 100 / 220)}
																onCancel={cancelLastPayment}
															/>
														) : payment?.isPaid ? (
															<span className="text-green-600 font-medium">已繳 {currentPaidCount} 次</span>
														) : null}
														{canManage && remainingCount > 0 ? (
														<form action={async (formData: FormData) => {
															'use server'
															const userId = String(formData.get('userId'))
															const month = String(formData.get('month'))
															const inputCount = Number(formData.get('inputCount'))
															if (!userId || !month || !inputCount) return
															// 檢查現有繳費記錄
															const existingPayment = await prisma.memberMonthlyPayment.findUnique({
																where: { userId_month: { userId, month } }
															})
															// 計算已繳費次數和剩餘未繳費次數
															const currentPaidAmount = existingPayment?.amount || 0
															const currentPaidCount = Math.round(currentPaidAmount / 100 / 220)
															const remainingUnpaidCount = registrationCount - currentPaidCount
															if (remainingUnpaidCount <= 0) return
															const actualInputCount = Math.min(inputCount, remainingUnpaidCount)
															const user = await prisma.user.findUnique({ where: { id: userId } })
															if (!user) return
															const amount = 220 * actualInputCount
															const amountCents = amount * 100
															const newTotalAmount = currentPaidAmount + amountCents
															const monthlyPayment = await prisma.memberMonthlyPayment.upsert({
																where: { userId_month: { userId, month } },
																create: { userId, month, isPaid: true, amount: newTotalAmount, paidAt: new Date() },
																update: { isPaid: true, amount: newTotalAmount, paidAt: new Date() }
															})
															let category = await prisma.financeCategory.findFirst({ where: { name: '組聚收入' } })
															if (!category) {
																category = await prisma.financeCategory.create({ data: { name: '組聚收入', type: 'INCOME', system: true } })
															}
															await prisma.financeTransaction.create({
																data: {
																	date: new Date(),
																	type: 'INCOME',
																	amountCents: amountCents,
																	counterparty: user.name || '未命名',
																	note: `${month} 單次成員繳費 (${actualInputCount}次活動 × $220)`,
																	categoryId: category.id,
																	monthlyPaymentId: monthlyPayment.id
																}
															})
															const startDate = new Date(`${month}-01`)
															const endDate = new Date(startDate)
															endDate.setMonth(endDate.getMonth() + 1)
															const unpaidRegistrations = await prisma.registration.findMany({
																where: {
																	userId: userId,
																	status: 'REGISTERED',
																	paymentStatus: 'UNPAID',
																	event: { type: { in: ['GENERAL', 'JOINT', 'CLOSED'] }, startAt: { gte: startDate, lt: endDate } }
																},
																include: { event: true },
																orderBy: { event: { startAt: 'asc' } }
															})
															const registrationsToUpdate = unpaidRegistrations.slice(0, actualInputCount)
															if (registrationsToUpdate.length > 0) {
																await prisma.registration.updateMany({ where: { id: { in: registrationsToUpdate.map(r => r.id) } }, data: { paymentStatus: 'PAID' } })
															}
															revalidatePath('/admin/members')
														}} className="inline space-y-1">
														<input type="hidden" name="userId" value={member.id} />
														<input type="hidden" name="month" value={month} />
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input type="tel" inputMode="numeric" pattern="[0-9]*" name="inputCount" min="1" max={(() => {
                                                                const currentPaidAmount = payment?.amount || 0
                                                                const currentPaidCount = Math.round(currentPaidAmount / 100 / 220)
                                                                return registrationCount - currentPaidCount
                                                            })()} defaultValue={(() => {
                                                            const currentPaidAmount = payment?.amount || 0
                                                            const currentPaidCount = Math.round(currentPaidAmount / 100 / 220)
                                                            return registrationCount - currentPaidCount
                                                        })()} className="w-10 h-6 text-[12px] px-1 py-0 border rounded text-center appearance-none" required />
                                                            <span className="text-xs">次</span>
						</div>
                                                        <button type="submit" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 rounded whitespace-nowrap" style={{ fontSize: '12px', lineHeight: '14px', height: '20px !important', padding: '1px 3px !important', minHeight: '20px' }}>繳費 $220/次</button>
					</form>
														) : !canManage && remainingCount > 0 ? (
															<span className="text-xs text-red-600 font-medium">未繳 {remainingCount} 次</span>
														) : null}
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

