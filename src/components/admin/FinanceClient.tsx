'use client'
import { useState } from 'react'
import Button from '@/components/ui/Button'

type Transaction = {
	id: string
	date: string
	type: 'INCOME' | 'EXPENSE'
	amountCents: number
	counterparty: string | null
	note: string | null
	category: { name: string } | null
}

export default function FinanceClient({ 
	transactions, 
	canManage,
	deleteTxn 
}: { 
	transactions: Transaction[]
	canManage: boolean
	deleteTxn: (formData: FormData) => Promise<{ success: boolean; error?: string }>
}) {
	const [editMode, setEditMode] = useState(false)
	const [error, setError] = useState<string | null>(null)

	return (
		<div className="bg-white rounded-lg border">
			<div className="p-4 border-b flex items-center justify-between">
				<h2 className="font-medium">交易清單</h2>
				{canManage && (
					<Button 
						onClick={() => {
							setEditMode(!editMode)
							setError(null) // 清除錯誤訊息
						}}
						variant="outline"
						size="sm"
					>
						{editMode ? '取消編輯' : '編輯'}
					</Button>
				)}
			</div>
			{error && (
				<div className="p-4 bg-red-50 border-b">
					<div className="text-red-700 text-sm">
						❌ {error}
					</div>
				</div>
			)}
			<div className="overflow-x-auto">
				<table className="w-full text-xs sm:text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-3 text-left font-medium">日期</th>
							<th className="px-4 py-3 text-left font-medium">類型</th>
							<th className="px-4 py-3 text-left font-medium">項目</th>
							<th className="px-4 py-3 text-left font-medium">對象</th>
							<th className="px-4 py-3 text-right font-medium">金額</th>
							<th className="px-4 py-3 text-left font-medium">摘要</th>
							{editMode && <th className="px-4 py-3 text-center font-medium">操作</th>}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{transactions.map(txn => (
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
								{editMode && (
									<td className="px-4 py-3 text-center">
										{canManage && (
											<form action={async (formData: FormData) => {
												setError(null)
												const result = await deleteTxn(formData)
												if (!result.success && result.error) {
													setError(result.error)
												}
											}} className="inline" onSubmit={(e) => {
												if (!confirm('確定要刪除這筆交易嗎？')) e.preventDefault()
											}}>
												<input type="hidden" name="id" value={txn.id} />
												<Button type="submit" variant="danger" size="sm">刪除</Button>
											</form>
										)}
									</td>
								)}
							</tr>
						))}
						{transactions.length === 0 && (
							<tr>
								<td colSpan={editMode ? 7 : 6} className="px-4 py-8 text-center text-gray-500">
									暫無交易記錄
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	)
}
