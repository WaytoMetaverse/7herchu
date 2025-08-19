import { prisma } from '@/lib/prisma'
import { EventType, FinanceTxnType, Prisma, Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Button from '@/components/ui/Button'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function FinancePage({ searchParams }: { searchParams?: Promise<{ type?: string; month?: string }> }) {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin' as Role) || roles.includes('finance_manager' as Role)
	const sp = searchParams ? await searchParams : undefined
	const type = (sp?.type || '') as FinanceTxnType | ''
	const month = (sp?.month || new Date().toISOString().slice(0,7))

	const where: Prisma.FinanceTransactionWhereInput = {}
	if (type) where.type = type
	if (month) {
		const start = new Date(`${month}-01T00:00:00`)
		const end = new Date(start)
		end.setMonth(end.getMonth() + 1)
		where.date = { gte: start, lt: end }
	}

	const txns = await prisma.financeTransaction.findMany({ where, orderBy: { date: 'asc' }, take: 1000, include: { category: true } })

	function toCsv(rows: typeof txns) {
		const headers = ['日期','類型','金額(元)','項目','對象','備註']
		const lines = rows.map((r) => [
			new Date(r.date).toLocaleDateString('zh-TW'),
			r.type,
			(r.amountCents/100).toString(),
			r.category?.name || '',
			r.counterparty || '',
			r.note || '',
		].map(s => `"${String(s).replaceAll('"','""')}"`).join(','))
		return [headers.join(','), ...lines].join('\n')
	}
	const csv = toCsv(txns)

	const CATEGORY_INCOME = ['組聚收入','來賓收入','贊助','其他']
	const CATEGORY_EXPENSE = ['活動支出','場地支出','其他']

	async function createTxn(formData: FormData) {
		'use server'
		const date = String(formData.get('date') || '')
		const type = String(formData.get('type') || 'INCOME') as FinanceTxnType
		const amount = Number(String(formData.get('amount') || '0'))
		const categoryName = String(formData.get('category') || '')
		const counterparty = String(formData.get('counterparty') || '') || undefined
		const note = String(formData.get('note') || '') || undefined
		if (!date || !amount || !categoryName) return

		// 僅允許固定選單
		const allowed = type === 'INCOME' ? CATEGORY_INCOME : CATEGORY_EXPENSE
		if (!allowed.includes(categoryName)) return

		// 使用固定分類名稱查找已存在的分類，不存在就拒絕（不自動建立）
		const existing = await prisma.financeCategory.findFirst({ where: { name: categoryName, type } })
		if (!existing) return

		await prisma.financeTransaction.create({
			data: {
				date: new Date(date),
				type,
				amountCents: Math.round(amount * 100),
				categoryId: existing.id,
				counterparty,
				note,
			},
		})
		revalidatePath('/admin/finance')
	}

	async function deleteTxn(formData: FormData) {
		'use server'
		const id = String(formData.get('id') || '')
		if (!id) return
		await prisma.financeTransaction.delete({ where: { id } })
		revalidatePath('/admin/finance')
	}

	// 固定成員訊息產生：統計本月 GENERAL/JOINT/CLOSED 次數
	const monthStart = new Date(`${month}-01T00:00:00`)
	const monthEnd = new Date(monthStart)
	monthEnd.setMonth(monthEnd.getMonth() + 1)
	const fixedCount = await prisma.event.count({ where: { startAt: { gte: monthStart, lt: monthEnd }, type: { in: [EventType.GENERAL, EventType.JOINT, EventType.CLOSED] } } })
	const fixedMsg = `請夥伴們幫忙繳交${month.slice(5,7)}月建築組聚費用\n180乘以${fixedCount}次 = ${fixedCount * 180}`

	// 單次成員（UNPAID）統計訊息（每人：220乘以N次 = 金額）
	const singleRegs = await prisma.registration.findMany({
		where: {
			role: 'MEMBER',
			billingType: 'SINGLE_220',
			paymentStatus: 'UNPAID',
			event: { startAt: { gte: monthStart, lt: monthEnd } },
		},
		select: { userId: true, name: true, user: { select: { name: true, email: true } } },
	})
	const singleCountByUser = new Map<string, { label: string; count: number }>()
	singleRegs.forEach((r) => {
		const key = r.userId || r.user?.email || r.name || 'unknown'
		const label = r.user?.name || r.name || r.user?.email || '未命名'
		const prev = singleCountByUser.get(key)
		if (prev) prev.count += 1
		else singleCountByUser.set(key, { label, count: 1 })
	})
	const singleLines: string[] = []
	singleCountByUser.forEach(({ label, count }) => {
		if (count > 0) singleLines.push(`${label}  220乘以${count}次 = ${count * 220}`)
	})
	const singleMsg = singleLines.length ? singleLines.join('\n') : '（本月無單次未繳費）'

	return (
		<div className="max-w-5xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">財務管理</h1>
				{canManage ? <Link href="/admin/members" className="text-sm text-blue-600 underline">成員管理</Link> : null}
			</div>

			<section className="space-y-2">
				<h2 className="text-lg font-medium">月份</h2>
				<form className="flex items-center gap-2 text-sm">
					<input type="month" name="month" defaultValue={month} className="border rounded px-2 py-1" />
					<Button type="submit" variant="outline">切換月份</Button>
				</form>
			</section>

			<section className="space-y-2">
				<h2 className="text-lg font-medium">固定成員 · 自動繳費訊息</h2>
				<div className="text-sm whitespace-pre-wrap border rounded p-3 bg-slate-50">{fixedMsg}</div>
			</section>

			<section className="space-y-2">
				<h2 className="text-lg font-medium">單次成員 · 繳費統計（未繳）</h2>
				<div className="text-sm whitespace-pre-wrap border rounded p-3 bg-slate-50">{singleMsg}</div>
			</section>

			<section className="space-y-3">
				<h2 className="text-lg font-medium">新增交易</h2>
				{canManage ? (
				<form action={createTxn} className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
					<label className="text-sm">日期
						<input name="date" type="date" className="mt-1 border rounded w-full px-2 py-1" required />
					</label>
					<label className="text-sm">類型
						<select name="type" className="mt-1 border rounded w-full px-2 py-1">
							<option value="INCOME">收入</option>
							<option value="EXPENSE">支出</option>
						</select>
					</label>
					<label className="text-sm">項目
						<select name="category" className="mt-1 border rounded w-full px-2 py-1">
							<option value="">—</option>
							{CATEGORY_INCOME.map(o => <option key={o} value={o}>{o}</option>)}
							{CATEGORY_EXPENSE.map(o => <option key={o} value={o}>{o}</option>)}
						</select>
					</label>
					<label className="text-sm">對象
						<input name="counterparty" className="mt-1 border rounded w-full px-2 py-1" placeholder="付款人/收款人" />
					</label>
					<label className="text-sm">金額（元）
						<input name="amount" type="number" step="1" min={0} className="mt-1 border rounded w-full px-2 py-1" required />
					</label>
					<label className="text-sm md:col-span-3">摘要
						<input name="note" className="mt-1 border rounded w-full px-2 py-1" />
					</label>
					<div className="md:col-span-3">
						<Button type="submit">新增</Button>
					</div>
				</form>
				) : (
					<div className="text-sm text-gray-500">您沒有新增權限</div>
				)}
			</section>

			<section className="space-y-3">
				<h2 className="text-lg font-medium">交易清單</h2>
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<form>
						<select name="type" defaultValue={type} className="border rounded px-2 py-1">
							<option value="">全部類型</option>
							<option value="INCOME">收入</option>
							<option value="EXPENSE">支出</option>
						</select>
						<input type="month" name="month" defaultValue={month} className="ml-2 border rounded px-2 py-1" />
						<Button type="submit" variant="outline" className="ml-2">篩選</Button>
					</form>
					<a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download={`finance-${month || 'all'}.csv`} className="ml-auto text-blue-600 underline">匯出 CSV</a>
				</div>
				{(() => {
					let running = 0
					const rows = txns.map((t) => {
						const income = t.type === 'INCOME' ? t.amountCents / 100 : 0
						const expense = t.type === 'EXPENSE' ? t.amountCents / 100 : 0
						running += income - expense
						return { t, income, expense, balance: running }
					})
					return (
						<div className="rounded border overflow-hidden">
							<div className="grid grid-cols-8 gap-2 px-3 py-2 text-xs bg-slate-50 text-gray-600">
								<div>日期</div>
								<div>項目</div>
								<div>對象</div>
								<div>摘要</div>
								<div className="text-right">收入</div>
								<div className="text-right">支出</div>
								<div className="text-right">餘額</div>
								<div>操作</div>
							</div>
							{rows.map(({ t, income, expense, balance }) => (
								<div key={t.id} className="grid grid-cols-8 gap-2 px-3 py-2 text-sm border-t items-center">
									<div>{new Date(t.date).toLocaleDateString('zh-TW')}</div>
									<div>{t.category?.name || '-'}</div>
									<div>{t.counterparty || '-'}</div>
									<div className="truncate" title={t.note || ''}>{t.note || '-'}</div>
									<div className="text-right">{income ? income.toLocaleString() : ''}</div>
									<div className="text-right">{expense ? expense.toLocaleString() : ''}</div>
									<div className="text-right">{balance.toLocaleString()}</div>
									<div>
										{canManage ? (
											<form action={deleteTxn}>
												<input type="hidden" name="id" value={t.id} />
												<Button variant="danger" size="sm">刪除</Button>
											</form>
										) : null}
									</div>
								</div>
							))}
							{txns.length === 0 && (
								<div className="p-3 text-sm text-gray-500">尚無資料</div>
							)}
						</div>
					)
				})()}
			</section>
		</div>
	)
}


