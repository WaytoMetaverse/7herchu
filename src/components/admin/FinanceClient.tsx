'use client'
import React from 'react'

export default function FinanceClient({ transactions }: { transactions: { id: string, date: string, type: 'INCOME' | 'EXPENSE', amountCents: number, categoryName: string, note?: string }[] }) {
	return (
		<div className="space-y-2 text-xs sm:text-sm">
			{transactions.map((txn) => (
				<div key={txn.id} className="flex items-center justify-between py-1 border-b border-gray-100">
					<div className="flex-1 min-w-0 pr-2">
						{/* 手機版：顯示標題（category）在第一行，第二行輔助資訊 */}
						<div className="sm:hidden">
							<div className="truncate text-gray-800 font-medium leading-tight">{txn.categoryName || '-'}</div>
							<div className="text-[11px] text-gray-500 leading-tight truncate">{txn.date}{txn.note ? ` · ${txn.note}` : ''}</div>
						</div>
						{/* 桌面版：維持原有 note 為主，下一行顯示日期與分類 */}
						<div className="hidden sm:block">
							<div className="truncate text-gray-700 leading-tight">{txn.note || '-'}</div>
							<div className="text-[11px] text-gray-500 leading-tight">{txn.date} · {txn.categoryName}</div>
						</div>
					</div>
					<div className="shrink-0 ml-2">
						<span className={(txn.type === 'INCOME' ? 'text-green-600' : 'text-red-600') + ' text-xs sm:text-sm'}>
							{txn.type === 'INCOME' ? '+' : '-'}{(txn.amountCents / 100).toLocaleString()}
						</span>
					</div>
				</div>
			))}
		</div>
	)
}
