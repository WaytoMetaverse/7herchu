'use client'
import { useState, useEffect } from 'react'
import Button from './ui/Button'

interface ChecklistItem {
	id: string
	order: number
	content: string
	note: string | null
	isCompleted: boolean
	completedAt: Date | null
}

interface ChecklistModalProps {
	eventId: string
	isOpen: boolean
	onClose: () => void
}

export default function ChecklistModal({ eventId, isOpen, onClose }: ChecklistModalProps) {
	const [items, setItems] = useState<ChecklistItem[]>([])
	const [loading, setLoading] = useState(true)
	const [updating, setUpdating] = useState<string | null>(null)
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [noteText, setNoteText] = useState('')

	// 載入檢核清單
	useEffect(() => {
		if (isOpen && eventId) {
			loadChecklist()
		}
	}, [isOpen, eventId])

	const loadChecklist = async () => {
		setLoading(true)
		try {
			const res = await fetch(`/api/events/${eventId}/checklist`)
			if (res.ok) {
				const data = await res.json()
				setItems(data.items || [])
			}
		} catch (error) {
			console.error('Failed to load checklist:', error)
		} finally {
			setLoading(false)
		}
	}

	// 重置檢核清單
	const resetChecklist = async () => {
		if (!confirm('確定要重置檢核清單嗎？\n\n此操作將刪除所有現有項目（包括勾選狀態和備註），並根據活動類型重新生成標準檢核清單。')) {
			return
		}

		setLoading(true)
		try {
			const res = await fetch(`/api/events/${eventId}/checklist`, {
				method: 'DELETE'
			})
			if (res.ok) {
				const data = await res.json()
				setItems(data.items || [])
				setExpandedId(null)
				setNoteText('')
			}
		} catch (error) {
			console.error('Failed to reset checklist:', error)
		} finally {
			setLoading(false)
		}
	}

	// 切換完成狀態
	const toggleItem = async (itemId: string, currentStatus: boolean) => {
		setUpdating(itemId)
		try {
			const res = await fetch(`/api/events/${eventId}/checklist`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId,
					isCompleted: !currentStatus
				})
			})
			if (res.ok) {
				const data = await res.json()
				setItems(prev =>
					prev.map(item =>
						item.id === itemId ? { ...item, isCompleted: data.item.isCompleted, completedAt: data.item.completedAt } : item
					)
				)
			}
		} catch (error) {
			console.error('Failed to toggle item:', error)
		} finally {
			setUpdating(null)
		}
	}

	// 切換展開/收合備註
	const toggleNote = (item: ChecklistItem) => {
		if (expandedId === item.id) {
			setExpandedId(null)
			setNoteText('')
		} else {
			setExpandedId(item.id)
			setNoteText(item.note || '')
		}
	}

	// 儲存備註
	const saveNote = async (itemId: string) => {
		setUpdating(itemId)
		try {
			const res = await fetch(`/api/events/${eventId}/checklist`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					itemId,
					note: noteText
				})
			})
			if (res.ok) {
				const data = await res.json()
				setItems(prev =>
					prev.map(item =>
						item.id === itemId ? { ...item, note: data.item.note } : item
					)
				)
			}
		} catch (error) {
			console.error('Failed to save note:', error)
		} finally {
			setUpdating(null)
		}
	}

	// 計算完成進度
	const completedCount = items.filter(item => item.isCompleted).length
	const totalCount = items.length
	const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
			{/* 標題列 */}
			<div className="flex items-center justify-between p-4 border-b">
				<div>
					<h2 className="text-xl font-semibold">活動檢核清單</h2>
					<p className="text-sm text-gray-600 mt-1">
						已完成 {completedCount} / {totalCount} 項 ({progress}%)
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={resetChecklist}
						disabled={loading || totalCount === 0}
						className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
						title="重置檢核清單"
					>
						重置
					</button>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 p-2"
						aria-label="關閉"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>

				{/* 進度條 */}
				<div className="px-4 pt-4">
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className="bg-green-600 h-2 rounded-full transition-all duration-300"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>

				{/* 檢核清單內容 */}
				<div className="flex-1 overflow-y-auto p-4">
					{loading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-gray-500">載入中...</div>
						</div>
					) : items.length === 0 ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-gray-500">此活動類型無檢核清單</div>
						</div>
					) : (
						<div className="space-y-3">
							{items.map((item) => (
								<div
									key={item.id}
									className={`rounded-lg border transition-colors ${
										item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
									}`}
								>
									<div className="flex items-start gap-3 p-3">
										<button
											onClick={() => toggleItem(item.id, item.isCompleted)}
											disabled={updating === item.id}
											className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
												item.isCompleted
													? 'bg-green-600 border-green-600'
													: 'border-gray-300 hover:border-green-500'
											} ${updating === item.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
										>
											{item.isCompleted && (
												<svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
												</svg>
											)}
										</button>
										<div className="flex-1 min-w-0">
											<p
												className={`text-sm ${
													item.isCompleted ? 'text-gray-500 line-through' : 'text-gray-800'
												}`}
											>
												{item.order}. {item.content}
											</p>
											{item.note && !expandedId && (
												<p className="text-xs text-gray-500 mt-1 italic">
													📝 {item.note}
												</p>
											)}
										</div>
									<button
										onClick={() => toggleNote(item)}
										className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
										title={item.note ? '編輯會議記錄' : '新增會議記錄'}
									>
											<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
									</div>

					{/* 展開的會議記錄輸入區 */}
					{expandedId === item.id && (
						<div className="px-3 pb-3 pt-0 space-y-2 border-t mt-2">
							<label className="block text-sm font-medium text-gray-700 mb-1">會議記錄</label>
							<textarea
								value={noteText}
								onChange={(e) => setNoteText(e.target.value)}
								placeholder="記錄會議討論內容、決議事項、待辦事項等..."
								rows={8}
								className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
								disabled={updating === item.id}
							/>
											<div className="flex gap-2">
												<button
													onClick={() => saveNote(item.id)}
													disabled={updating === item.id}
													className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
												>
													儲存
												</button>
												<button
													onClick={() => {
														setExpandedId(null)
														setNoteText('')
													}}
													disabled={updating === item.id}
													className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
												>
													取消
												</button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{/* 底部按鈕 */}
				<div className="p-4 border-t">
					<Button onClick={onClose} variant="outline" className="w-full">
						關閉
					</Button>
				</div>
			</div>
		</div>
	)
}

