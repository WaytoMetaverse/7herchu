'use client'

import { useState } from 'react'

interface CancelPaymentButtonProps {
	userId: string
	month: string
	amount: number
	activityCount: number
	onCancel: (formData: FormData) => Promise<void>
}

export default function CancelPaymentButton({ 
	userId, 
	month, 
	amount, 
	activityCount, 
	onCancel 
}: CancelPaymentButtonProps) {
	const [showConfirm, setShowConfirm] = useState(false)

	const handleCancel = async () => {
		const formData = new FormData()
		formData.append('userId', userId)
		formData.append('month', month)
		await onCancel(formData)
		setShowConfirm(false)
	}

	return (
		<>
			<button
				onClick={() => setShowConfirm(true)}
				className="text-xs text-green-600 hover:text-green-800 underline cursor-pointer"
			>
				已繳月費 ${amount / 100}
				<div className="text-xs text-gray-500">
					({activityCount}次活動)
				</div>
			</button>

			{showConfirm && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full mx-4">
						<h3 className="text-lg font-medium mb-4">確認取消繳費</h3>
						<p className="text-gray-600 mb-6">
							確認取消最後一次繳費？
							<br />
							<span className="text-sm text-gray-500">
								此操作將刪除對應的財務記錄並更新活動繳費狀態
							</span>
						</p>
						<div className="flex gap-3 justify-end">
							<button
								onClick={() => setShowConfirm(false)}
								className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
							>
								取消
							</button>
							<button
								onClick={handleCancel}
								className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
							>
								確認取消繳費
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
