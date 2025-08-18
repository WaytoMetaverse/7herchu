import { prisma } from '@/lib/prisma'
import { FinanceTxnType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Button from '@/components/ui/Button'

export default async function FinancePage({ searchParams }: { searchParams?: Promise<{ type?: string; month?: string }> }) {
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

	const txns = await prisma.financeTransaction.findMany({ where, orderBy: { date: 'desc' }, take: 1000, include: { category: true } })

	function toCsv(rows: typeof txns) {
		const headers = ['日期','類型','金額(元)','項目','對象','備註']
		const lines = rows.map(r => [
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

	return (
		<div className="max-w-5xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">財務管理</h1>
			</div>

			<p className="text-sm text-gray-600">本頁僅做公司內部記帳使用，無任何金流/支付 API 串接。</p>

			<section className="space-y-3">
				<h2 className="text-lg font-medium">新增交易</h2>
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
					<label className="text-sm">金額（元）
						<input name="amount" type="number" step="1" min={0} className="mt-1 border rounded w-full px-2 py-1" required />
					</label>
					<label className="text-sm">項目
						<select name="category" className="mt-1 border rounded w-full px-2 py-1">
							<option value="">—</option>
							{CATEGORY_INCOME.map(o => <option key={o} value={o}>{o}</option>)}
							{CATEGORY_EXPENSE.map(o => <option key={o} value={o}>{o}</option>)}
						</select>
					</label>
					<label className="text-sm">對象（選填）
						<input name="counterparty" className="mt-1 border rounded w-full px-2 py-1" placeholder="付款人/收款人" />
					</label>
					<label className="text-sm md:col-span-3">備註（選填）
						<input name="note" className="mt-1 border rounded w-full px-2 py-1" />
					</label>
					<div className="md:col-span-3">
						<Button type="submit">新增</Button>
					</div>
				</form>
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
				<div className="divide-y rounded border">
					{txns.map(t => (
						<div key={t.id} className="p-3 text-sm flex items-center justify-between">
							<div>
								<div className="font-medium">{new Date(t.date).toLocaleDateString('zh-TW')} · {t.type === 'INCOME' ? '收入' : '支出'} · ${(t.amountCents/100).toLocaleString()} 元</div>
								<div className="text-gray-600">
									{t.category?.name ? `項目：${t.category.name} · ` : ''}
									{t.counterparty ? `對象：${t.counterparty}` : ''}
								</div>
								{t.note ? <div className="text-gray-500">備註：{t.note}</div> : null}
							</div>
							<form action={deleteTxn}>
								<input type="hidden" name="id" value={t.id} />
								<Button variant="danger" size="sm">刪除</Button>
							</form>
						</div>
					))}
					{txns.length === 0 && (
						<div className="p-3 text-sm text-gray-500">尚無資料</div>
					)}
				</div>
			</section>
		</div>
	)
}


