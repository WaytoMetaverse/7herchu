'use client'
import React from 'react'

type Txn = {
	id: string
	date: string
	type: 'INCOME' | 'EXPENSE'
	amountCents: number
	categoryName: string
	counterparty: string
	note?: string
}

export default function FinanceClient({ 
	transactions,
	canManage,
	showDelete,
	deleteAction,
}: { 
	transactions: Txn[]
	canManage?: boolean
	showDelete?: boolean
	deleteAction?: (formData: FormData) => void | Promise<void>
}) {
	return (
		<div className="space-y-2">
			{/* 標題列：與新增交易相同欄位順序 */}
			<div className="grid grid-cols-12 items-center px-2 text-[11px] sm:text-xs text-gray-500">
				<div className="col-span-2 sm:col-span-2">日期</div>
				<div className="col-span-2 sm:col-span-1">類型</div>
				<div className="col-span-3 sm:col-span-3">項目</div>
				<div className="col-span-2 sm:col-span-2">對象</div>
				<div className="col-span-2 sm:col-span-2 text-right">金額（元）</div>
				<div className="col-span-3 sm:col-span-2 sm:text-right">摘要</div>
				{canManage && showDelete ? (
					<div className="hidden sm:block text-right">操作</div>
				) : null}
			</div>

			{transactions.map((txn) => (
				<div key={txn.id} className="grid grid-cols-12 items-center gap-x-2 py-1 border-b border-gray-100 text-xs sm:text-sm">
					{/* 日期 */}
					<div className="col-span-2 sm:col-span-2 px-2 text-gray-700">{txn.date}</div>
					{/* 類型 */}
					<div className="col-span-2 sm:col-span-1 px-2 text-gray-700">{txn.type === 'INCOME' ? '收入' : '支出'}</div>
					{/* 項目（分類） */}
					<div className="col-span-3 sm:col-span-3 px-2 truncate text-gray-800 font-medium">{txn.categoryName || '-'}</div>
					{/* 對象 */}
					<div className="col-span-2 sm:col-span-2 px-2 truncate text-gray-700">{txn.counterparty || '-'}</div>
					{/* 金額 */}
					<div className="col-span-2 sm:col-span-2 px-2 text-right">
						<span className={txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}>
							{txn.type === 'INCOME' ? '+' : '-'}{(txn.amountCents / 100).toLocaleString()}
						</span>
					</div>
					{/* 摘要 */}
					<div className="col-span-3 sm:col-span-2 px-2 sm:text-right truncate text-gray-600">
						{txn.note || '-'}
					</div>
					{/* 刪除操作（僅管理且刪除模式） */}
					{canManage && showDelete && deleteAction ? (
						<form action={deleteAction} className="col-span-12 sm:col-span-2 px-2 sm:text-right mt-1 sm:mt-0">
							<input type="hidden" name="id" value={txn.id} />
							<button
								type="submit"
								className="inline-flex items-center text-[11px] sm:text-xs text-red-600 hover:text-red-700 whitespace-nowrap"
								onClick={(e) => { if (!confirm('確定刪除此交易？')) e.preventDefault() }}
							>
								刪除
							</button>
						</form>
					) : null}
				</div>
			))}
		</div>
	)
}
