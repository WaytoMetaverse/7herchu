'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function MobileQueryPage() {
	const [phone, setPhone] = useState('')
	const [results, setResults] = useState<{
		id: string
		eventId: string
		paymentStatus: string
		checkedInAt: string | null
		event?: {
			title: string
			startAt: string
		}
	}[]>([])
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const router = useRouter()

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setErr(null)

		const v = phone.trim()
		if (!/^\d{10}$/.test(v)) {
			setErr('請輸入10碼手機號碼')
			setLoading(false)
			return
		}

		try {
			// 使用新的來賓查詢 API
			const res = await fetch(`/api/guest/booking?phone=${encodeURIComponent(v)}`)
			const data = await res.json()
			
			if (!res.ok) {
				setErr(data.error || '查詢失敗')
				setLoading(false)
				return
			}

			setResults(data.data || [])
			if (!data.data || data.data.length === 0) {
				setErr('找不到相關報名記錄')
			}
		} catch {
			setErr('查詢失敗，請稍後再試')
		}

		setLoading(false)
	}

	function selectEvent(eventId: string) {
		// 跳轉到來賓編輯頁面（編輯模式）
		router.push(`/events/${eventId}/guest-edit?phone=${encodeURIComponent(phone)}&mode=edit`)
	}

	return (
		<div className="max-w-sm mx-auto p-4 space-y-6">
			<div className="text-center space-y-3">
				<h1 className="text-2xl font-semibold">報名查詢</h1>
				<p className="text-gray-600">請輸入手機號碼查詢您的活動報名記錄</p>
			</div>

			{err && <div className="text-sm text-red-600">{err}</div>}
			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">手機號碼</label>
					<input
						inputMode="numeric"
						maxLength={10}
						pattern="\d{10}"
						placeholder="請輸入10碼手機號碼"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
						className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>
				<div className="flex flex-col gap-3">
					<Button type="submit" variant="primary" size="sm" className="w-full min-h-[44px]">送出</Button>
					<Button as={Link} href="/hall" variant="outline" size="sm" className="w-full min-h-[44px]">取消</Button>
				</div>
			</form>

			{/* 查詢結果 */}
			{results.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-lg font-medium">查詢結果</h2>
					{results.length === 1 ? (
						// 只有一筆記錄，直接跳轉
						<div className="text-center">
							<Button 
								onClick={() => selectEvent(results[0].eventId)}
								variant="primary"
								className="w-full min-h-[44px]"
							>
								編輯 {results[0].event?.title} 報名資料
							</Button>
						</div>
					) : (
						// 多筆記錄，顯示選單
						<div className="space-y-3">
							<div className="text-gray-600">找到 {results.length} 筆報名記錄，請選擇要編輯的活動：</div>
							{results.map((reg) => (
								<button
									key={reg.id}
									onClick={() => selectEvent(reg.eventId)}
									className="w-full p-4 border rounded-lg text-left hover:bg-gray-50 active:bg-gray-100 transition-colors min-h-[60px]"
								>
									<div className="font-medium text-lg mb-1">{reg.event?.title}</div>
									<div className="text-gray-600 mb-2">
										{reg.event?.startAt ? format(new Date(reg.event.startAt), 'yyyy/MM/dd（EEEEE）', { locale: zhTW }) : '-'}
									</div>
									<div className="flex gap-2">
										<span className={`px-2 py-1 rounded-full text-xs ${reg.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
											{reg.paymentStatus === 'PAID' ? '已繳費' : '未繳費'}
										</span>
										{reg.checkedInAt && (
											<span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">已簽到</span>
										)}
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			)}

			<div className="text-center">
				<Button as={Link} href="/hall" variant="ghost">返回活動大廳</Button>
			</div>
		</div>
	)
}
