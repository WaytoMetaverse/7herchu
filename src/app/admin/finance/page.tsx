import { prisma } from '@/lib/prisma'
import { FinanceTxnType, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import Button from '@/components/ui/Button'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function FinancePage({ searchParams }: { searchParams?: Promise<{ month?: string; export?: string }> }) {
	const session = await getServerSession(authOptions)
	const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
	const canManage = roles.includes('admin') || roles.includes('finance_manager')
	const sp = searchParams ? await searchParams : undefined
	const month = (sp?.month || new Date().toISOString().slice(0,7))

	const where: Prisma.FinanceTransactionWhereInput = {}
	if (month) {
		const start = new Date(`${month}-01T00:00:00`)
		const end = new Date(start)
		end.setMonth(end.getMonth() + 1)
		where.date = { gte: start, lt: end }
	}

	const txns = await prisma.financeTransaction.findMany({ 
		where, 
		orderBy: { date: 'desc' }, 
		take: 1000, 
		include: { category: true } 
	})

	// 計算累積餘額
	const totalIncome = txns.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amountCents, 0)
	const totalExpense = txns.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amountCents, 0)
	const balance = totalIncome - totalExpense

	// 處理匯出
	if (sp?.export === 'csv') {
		const headers = ['日期','類型','金額(元)','項目','對象','備註']
		const lines = txns.map(r => [
			new Date(r.date).toLocaleDateString('zh-TW'),
			r.type === 'INCOME' ? '收入' : '支出',
			(r.amountCents/100).toString(),
			r.category?.name || '',
			r.counterparty || '',
			r.note || '',
		].map(s => `"${String(s).replaceAll('"','""')}"`).join(','))
		const csv = [headers.join(','), ...lines].join('\n')
		
		return new Response(csv, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="finance-${month}.csv"`
			}
		})
	}

	const CATEGORY_INCOME = ['組聚收入','來賓收入','贊助','其他收入']
	const CATEGORY_EXPENSE = ['活動支出','場地支出','其他支出']

	// 新增交易
	async function createTxn(formData: FormData) {
		'use server'
		const date = String(formData.get('date') || '')
		const type = String(formData.get('type') || 'INCOME') as FinanceTxnType
		const amount = Number(String(formData.get('amount') || '0'))
		const categoryName = String(formData.get('category') || '')
		const counterparty = String(formData.get('counterparty') || '') || undefined
		const note = String(formData.get('note') || '') || undefined
		
		if (!date || !amount || amount <= 0) return

		// 確保分類存在
		let category = await prisma.financeCategory.findFirst({ where: { name: categoryName } })
		if (!category && categoryName) {
			category = await prisma.financeCategory.create({
				data: { name: categoryName, type, system: false }
			})
		}

		await prisma.financeTransaction.create({
			data: {
				date: new Date(date),
				type,
				amountCents: Math.round(amount * 100),
				counterparty,
				note,
				categoryId: category?.id
			}
		})
		revalidatePath('/admin/finance')
	}

	// 刪除交易
	async function deleteTxn(formData: FormData) {
		'use server'
		const id = String(formData.get('id'))
		if (!id) return
		await prisma.financeTransaction.delete({ where: { id } })
		revalidatePath('/admin/finance')
	}

	return (
		<div className="max-w-6xl mx-auto p-4 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">財務管理</h1>
			</div>

			{/* 按鈕區 */}
			<div className="flex items-center gap-3">
				{canManage && (
					<>
						<Button 
							onClick={() => document.getElementById('add-form')?.scrollIntoView()}
							variant="primary"
						>
							新增交易
						</Button>
						<Button 
							onClick={() => {
								const editElements = document.querySelectorAll('.edit-mode-only')
								const isVisible = (editElements[0] as HTMLElement)?.style?.display !== 'none'
								editElements.forEach(el => {
									(el as HTMLElement).style.display = isVisible ? 'none' : 'table-cell'
								})
								const btn = (window.event?.target || window.event?.currentTarget) as HTMLButtonElement
								if (btn) btn.textContent = isVisible ? '編輯' : '取消編輯'
							}}
							variant="outline"
						>
							編輯
						</Button>
						<Button as={Link} href="/admin/members" variant="outline">成員管理</Button>
					</>
				)}
			</div>

			{/* 篩選區 */}
			<div className="flex items-center gap-3">
				<form className="flex items-center gap-2">
					<label>月份
						<input type="month" name="month" defaultValue={month} />
					</label>
					<Button type="submit" variant="outline">篩選</Button>
				</form>
				<Button as={Link} href="/admin/finance" variant="ghost">取消篩選</Button>
				<form method="GET">
					<input type="hidden" name="month" value={month} />
					<Button type="submit" name="export" value="csv" variant="secondary">匯出</Button>
				</form>
			</div>

			{/* 小計顯示 */}
			<div className="bg-gray-50 p-4 rounded-lg">
				<h2 className="font-medium mb-2">小計</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div>
						<div className="text-gray-600">收入</div>
						<div className="text-lg font-semibold text-green-600">NT$ {(totalIncome / 100).toLocaleString()}</div>
					</div>
					<div>
						<div className="text-gray-600">支出</div>
						<div className="text-lg font-semibold text-red-600">NT$ {(totalExpense / 100).toLocaleString()}</div>
					</div>
					<div>
						<div className="text-gray-600">累積餘額</div>
						<div className={`text-lg font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
							NT$ {(balance / 100).toLocaleString()}
						</div>
					</div>
				</div>
			</div>

			{/* 交易清單 */}
			<div className="bg-white rounded-lg border">
				<div className="p-4 border-b">
					<h2 className="font-medium">交易清單</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-4 py-3 text-left font-medium">日期</th>
								<th className="px-4 py-3 text-left font-medium">類型</th>
								<th className="px-4 py-3 text-left font-medium">項目</th>
								<th className="px-4 py-3 text-left font-medium">對象</th>
								<th className="px-4 py-3 text-right font-medium">金額</th>
								<th className="px-4 py-3 text-left font-medium">摘要</th>
								<th className="px-4 py-3 text-center font-medium edit-mode-only" style={{display: 'none'}}>操作</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{txns.map(txn => (
								<tr key={txn.id}>
									<td className="px-4 py-3">
										{new Date(txn.date).toLocaleDateString('zh-TW')}
									</td>
									<td className="px-4 py-3">
										<span className={`px-2 py-1 rounded text-xs ${
											txn.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
										}`}>
											{txn.type === 'INCOME' ? '收入' : '支出'}
										</span>
									</td>
									<td className="px-4 py-3">{txn.category?.name || '-'}</td>
									<td className="px-4 py-3">{txn.counterparty || '-'}</td>
									<td className="px-4 py-3 text-right font-medium">
										<span className={txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
											{txn.type === 'INCOME' ? '+' : '-'}NT$ {(txn.amountCents / 100).toLocaleString()}
										</span>
									</td>
									<td className="px-4 py-3 text-gray-600">{txn.note || '-'}</td>
									<td className="px-4 py-3 text-center edit-mode-only" style={{display: 'none'}}>
										{canManage && (
											<form action={deleteTxn} className="inline" onSubmit={(e) => {
												if (!confirm('確定要刪除這筆交易嗎？')) e.preventDefault()
											}}>
												<input type="hidden" name="id" value={txn.id} />
												<Button type="submit" variant="danger" size="sm">刪除</Button>
											</form>
										)}
									</td>
								</tr>
							))}
							{txns.length === 0 && (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-gray-500">
										暫無交易記錄
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* 新增交易表單 */}
			{canManage && (
				<div id="add-form" className="bg-white rounded-lg border p-4">
					<h2 className="font-medium mb-4">新增交易</h2>
					<form action={createTxn} className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<label>日期
							<input name="date" type="date" required />
						</label>
						<label>類型
							<select name="type">
								<option value="INCOME">收入</option>
								<option value="EXPENSE">支出</option>
							</select>
						</label>
						<label>項目
							<select name="category">
								<option value="">—</option>
								{CATEGORY_INCOME.map(c => <option key={c} value={c}>{c}</option>)}
								{CATEGORY_EXPENSE.map(c => <option key={c} value={c}>{c}</option>)}
							</select>
						</label>
						<label>對象
							<input name="counterparty" placeholder="付款人/收款人" />
						</label>
						<label>金額（元）
							<input name="amount" type="number" step="1" min="0" required />
						</label>
						<label className="md:col-span-1">摘要
							<input name="note" />
						</label>
						<div className="md:col-span-3">
							<Button type="submit">新增交易</Button>
						</div>
					</form>
				</div>
			)}
		</div>
	)
}