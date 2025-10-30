'use client'
import { useState } from 'react'
import Button from './ui/Button'

interface AnnouncementDialogProps {
	isOpen: boolean
	onClose: () => void
	onSuccess: () => void
}

export default function AnnouncementDialog({ isOpen, onClose, onSuccess }: AnnouncementDialogProps) {
	const [title, setTitle] = useState('')
	const [body, setBody] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		
		if (!title.trim() || !body.trim()) {
			setError('標題和內容都是必填的')
			return
		}

		setLoading(true)
		setError('')

		try {
			const res = await fetch('/api/announcements/send', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: title.trim(), body: body.trim() })
			})

			if (!res.ok) {
				const data = await res.json()
				throw new Error(data.error || '發送失敗')
			}

			// 清空表單
			setTitle('')
			setBody('')
			setError('')
			onSuccess()
			onClose()
		} catch (err) {
			setError(err instanceof Error ? err.message : '發送失敗，請稍後再試')
		} finally {
			setLoading(false)
		}
	}

	const handleClose = () => {
		if (!loading) {
			setTitle('')
			setBody('')
			setError('')
			onClose()
		}
	}

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
				{/* 標題列 */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-xl font-semibold">發送公告推播</h2>
					<button
						onClick={handleClose}
						disabled={loading}
						className="text-gray-400 hover:text-gray-600 p-2 disabled:opacity-50"
						aria-label="關閉"
					>
						<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* 表單內容 */}
				<form onSubmit={handleSubmit} className="p-4 space-y-4">
					{error && (
						<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
							{error}
						</div>
					)}

					<div>
						<label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
							通知標題 <span className="text-red-500">*</span>
						</label>
						<input
							id="title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="例如：重要公告"
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							disabled={loading}
							required
						/>
					</div>

					<div>
						<label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
							通知內容 <span className="text-red-500">*</span>
						</label>
						<textarea
							id="body"
							value={body}
							onChange={(e) => setBody(e.target.value)}
							placeholder="輸入通知內容..."
							rows={6}
							className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
							disabled={loading}
							required
						/>
					</div>

					<div className="flex gap-3 pt-2">
						<Button
							type="submit"
							disabled={loading || !title.trim() || !body.trim()}
							className="flex-1"
						>
							{loading ? '發送中...' : '發送推播'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={loading}
							className="flex-1"
						>
							取消
						</Button>
					</div>

					<p className="text-xs text-gray-500 text-center">
						推播將發送給所有啟用通知的用戶
					</p>
				</form>
			</div>
		</div>
	)
}
