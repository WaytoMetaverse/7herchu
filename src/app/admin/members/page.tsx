import { prisma } from '@/lib/prisma'
import { BillingType, EventType, PaymentStatus, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Button from '@/components/ui/Button'

const ROLE_LABEL: Record<Role, string> = {
	admin: '管理者',
	event_manager: '活動',
	menu_manager: '菜單',
	finance_manager: '財務',
	checkin_manager: '簽到',
}

async function updateRoles(formData: FormData) {
	'use server'
	const userId = String(formData.get('userId'))
	const roles = (formData.getAll('roles') as string[]).filter(Boolean) as Role[]
	await prisma.user.update({ where: { id: userId }, data: { roles } })
	revalidatePath('/admin/members')
}

function getMonthRange(month: string) {
	const start = new Date(`${month}-01T00:00:00`)
	const end = new Date(start)
	end.setMonth(end.getMonth() + 1)
	return { start, end }
}

async function payFixedMonth(formData: FormData) {
	'use server'
	const userId = String(formData.get('userId') || '')
	const month = String(formData.get('month') || '')
	if (!userId || !month) return
	const { start, end } = getMonthRange(month)
	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (!user) return

	const regs = await prisma.registration.findMany({
		where: {
			userId,
			role: 'MEMBER',
			billingType: BillingType.FIXED_MONTHLY,
			paymentStatus: PaymentStatus.MONTHLY_BILL,
			event: { startAt: { gte: start, lt: end }, type: { in: [EventType.GENERAL, EventType.JOINT] } },
		},
		select: { id: true, eventId: true },
	})
	const count = regs.length
	if (count === 0) { revalidatePath('/admin/members'); return }

	await prisma.$transaction(async (tx) => {
		const txn = await tx.financeTransaction.create({
			data: {
				date: end,
				type: 'INCOME',
				amountCents: 18000 * count,
				counterparty: user.name || user.email,
				note: `固定會員月結 ${month} · ${count} 次`,
			}
		})

		const ids = regs.map(r => r.id)
		if (ids.length) await tx.registration.updateMany({ where: { id: { in: ids } }, data: { paymentStatus: PaymentStatus.PAID } })

		const invoice = await tx.financeInvoice.upsert({
			where: { userId_month_type: { userId, month, type: 'fixed' } },
			create: { userId, month, type: 'fixed', count, amount: 18000 * count, status: 'paid', paidTxnId: txn.id },
			update: { count, amount: 18000 * count, status: 'paid', paidTxnId: txn.id },
		})
		if (regs.length) {
			await tx.financeLineItem.createMany({ data: regs.map(r => ({ invoiceId: invoice.id, eventId: r.eventId!, price: 18000 })) })
		}
	})

	revalidatePath('/admin/members')
	revalidatePath('/admin/finance')
}

async function paySingleForMonth(formData: FormData) {
	'use server'
	const userId = String(formData.get('userId') || '')
	const month = String(formData.get('month') || '')
	const countRequested = Number(String(formData.get('count') || '0'))
	if (!userId || !month || !countRequested) return
	const { start, end } = getMonthRange(month)
	const user = await prisma.user.findUnique({ where: { id: userId } })
	if (!user) return

	const regs = await prisma.registration.findMany({
		where: {
			userId,
			role: 'MEMBER',
			billingType: BillingType.SINGLE_220,
			paymentStatus: PaymentStatus.UNPAID,
			event: { startAt: { gte: start, lt: end }, type: { in: [EventType.GENERAL, EventType.CLOSED, EventType.JOINT] } },
		},
		orderBy: { createdAt: 'asc' },
		select: { id: true, eventId: true },
		take: countRequested,
	})
	const count = regs.length
	if (count === 0) { revalidatePath('/admin/members'); return }

	await prisma.$transaction(async (tx) => {
		const txn = await tx.financeTransaction.create({
			data: {
				date: end,
				type: 'INCOME',
				amountCents: 22000 * count,
				counterparty: user.name || user.email,
				note: `單次會員 ${month} 繳費 · ${count} 次`,
			}
		})

		const ids = regs.map(r => r.id)
		if (ids.length) await tx.registration.updateMany({ where: { id: { in: ids } }, data: { paymentStatus: PaymentStatus.PAID } })

		const invoice = await tx.financeInvoice.upsert({
			where: { userId_month_type: { userId, month, type: 'single' } },
			create: { userId, month, type: 'single', count, amount: 22000 * count, status: 'paid', paidTxnId: txn.id },
			update: { count, amount: 22000 * count, status: 'paid', paidTxnId: txn.id },
		})
		if (regs.length) {
			await tx.financeLineItem.createMany({ data: regs.map(r => ({ invoiceId: invoice.id, eventId: r.eventId!, price: 22000 })) })
		}
	})

	revalidatePath('/admin/members')
	revalidatePath('/admin/finance')
}

export default async function MembersPage({ searchParams }: { searchParams?: Promise<{ month?: string }> }) {
	const sp = searchParams ? await searchParams : undefined
	const month = sp?.month || new Date().toISOString().slice(0,7)
	const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, include: { memberProfile: true } })

	const enriched = await Promise.all(users.map(async (u) => {
		let fixedCount = 0
		let singleUnpaid = 0
		const { start, end } = getMonthRange(month)
		if (u.memberProfile?.memberType === 'FIXED') {
			fixedCount = await prisma.registration.count({
				where: {
					userId: u.id,
					role: 'MEMBER',
					billingType: BillingType.FIXED_MONTHLY,
					event: { startAt: { gte: start, lt: end }, type: { in: [EventType.GENERAL, EventType.JOINT] } },
				}
			})
		}
		if (u.memberProfile?.memberType === 'SINGLE') {
			singleUnpaid = await prisma.registration.count({
				where: {
					userId: u.id,
					role: 'MEMBER',
					billingType: BillingType.SINGLE_220,
					paymentStatus: PaymentStatus.UNPAID,
					event: { startAt: { gte: start, lt: end }, type: { in: [EventType.GENERAL, EventType.CLOSED, EventType.JOINT] } },
				}
			})
		}
		return { u, fixedCount, singleUnpaid }
	}))

	return (
		<div className="max-w-5xl mx-auto p-4 space-y-4">
			<h1 className="text-xl font-semibold">成員與權限</h1>

			<form className="flex items-center gap-2 text-sm">
				<label>
					<span className="mr-2">月份</span>
					<input type="month" name="month" defaultValue={month} className="border rounded px-2 py-1" />
				</label>
				<Button type="submit" variant="outline">切換月份</Button>
			</form>

			<div className="space-y-2">
				{enriched.map(({ u, fixedCount, singleUnpaid }) => (
					<div key={u.id} className="border rounded p-3 text-sm space-y-3">
						<form action={updateRoles} className="flex items-start justify-between gap-4">
							<div>
								<div className="font-medium">{u.name ?? '(未命名)'} <span className="text-gray-500">· {u.email}</span></div>
								<div className="text-gray-600">電話：{u.phone ?? '-'} {u.memberProfile ? `· 類型：${u.memberProfile.memberType}` : ''}</div>
							</div>
							<input type="hidden" name="userId" defaultValue={u.id} />
							<div className="grid grid-cols-2 md:grid-cols-5 gap-2">
								{(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
									<label key={r} className="inline-flex items-center gap-2">
										<input type="checkbox" name="roles" value={r} defaultChecked={u.roles.includes(r)} />
										<span>{ROLE_LABEL[r]}</span>
									</label>
								))}
							</div>
							<Button type="submit">儲存</Button>
						</form>

						{u.memberProfile?.memberType === 'FIXED' && (
							<form action={payFixedMonth} className="flex items-center gap-3">
								<input type="hidden" name="userId" value={u.id} />
								<input type="hidden" name="month" value={month} />
								<div className="text-gray-700">本月參與次數：{fixedCount} 次</div>
								<Button type="submit">固定會員 {month} 繳費</Button>
							</form>
						)}
						{u.memberProfile?.memberType === 'SINGLE' && (
							<form action={paySingleForMonth} className="flex items-center gap-3">
								<input type="hidden" name="userId" value={u.id} />
								<input type="hidden" name="month" value={month} />
								<div className="text-gray-700">本月未繳次數：{singleUnpaid} 次</div>
								<label className="inline-flex items-center gap-2">
									<span>繳費次數</span>
									<input name="count" type="number" min={1} defaultValue={singleUnpaid || 1} className="border rounded px-2 py-1 w-20" />
								</label>
								<Button type="submit">單次會員 {month} 繳費</Button>
							</form>
						)}
					</div>
				))}
			</div>
		</div>
	)
}
