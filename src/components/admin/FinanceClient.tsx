'use client'
import React from 'react'

export default function FinanceClient({ transactions }: { transactions: { id: string, date: string, type: 'INCOME' | 'EXPENSE', amountCents: number, categoryName: string, note?: string }[] }) {
	return (
		<div className="space-y-1.5 text-[11px] sm:text-xs">
			{transactions.map((txn) => (
				<div key={txn.id} className="flex items-center justify-between py-1 border-b border-gray-100">
					<div className="flex-1 min-w-0 pr-2">
						<div className="truncate text-gray-700 leading-tight">{txn.note || '-'}</div>
						<div className="text-[10px] text-gray-500 leading-tight">{txn.date} · {txn.categoryName}</div>
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
