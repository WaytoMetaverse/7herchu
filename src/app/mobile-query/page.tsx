'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function MobileQueryPage() {
	const [phone, setPhone] = useState('')
	const [results, setResults] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const router = useRouter()

	async function searchRegistrations() {
		setLoading(true)
		setErr(null)

		const v = phone.trim()
		if (!/^\d{10}$/.test(v)) {
			setErr('請輸入10碼手機號碼')
			setLoading(false)
			return
		}

		try {
			const res = await fetch(`/api/registrations/search?phone=${encodeURIComponent(v)}`)
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
		} catch (error) {
			setErr('查詢失敗，請稍後再試')
		}

		setLoading(false)
	}

	function selectEvent(eventId: string) {
		router.push(`/events/${eventId}/guest-status?phone=${encodeURIComponent(phone)}`)
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">手機查詢報名</h1>
				<p className="text-gray-600 text-sm">輸入手機號碼查詢您的活動報名記錄</p>
			</div>

			{err && <div className="text-red-600 text-sm text-center">{err}</div>}

			<div className="space-y-4">
				<div>
					<label>手機號碼</label>
					<input
						inputMode="numeric"
						maxLength={10}
						pattern="\d{10}"
						placeholder="請輸入10碼手機號碼"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
				</div>

				<Button 
					disabled={loading || !phone.trim()} 
					onClick={searchRegistrations}
					className="w-full"
				>
					{loading ? '查詢中…' : '查詢報名記錄'}
				</Button>
			</div>

			{/* 查詢結果 */}
			{results.length > 0 && (
				<div className="space-y-3">
					<h2 className="font-medium">查詢結果</h2>
					{results.length === 1 ? (
						// 只有一筆記錄，直接跳轉
						<div className="text-center">
							<Button 
								onClick={() => selectEvent(results[0].eventId)}
								variant="primary"
								className="w-full"
							>
								查看 {results[0].event?.title} 報名詳情
							</Button>
						</div>
					) : (
						// 多筆記錄，顯示選單
						<div className="space-y-2">
							<div className="text-sm text-gray-600">找到 {results.length} 筆報名記錄，請選擇：</div>
							{results.map((reg: any) => (
								<button
									key={reg.id}
									onClick={() => selectEvent(reg.eventId)}
									className="w-full p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors"
								>
									<div className="font-medium">{reg.event?.title}</div>
									<div className="text-sm text-gray-600">
										{format(new Date(reg.event?.startAt), 'yyyy/MM/dd（EEEEE）', { locale: zhTW })}
									</div>
									<div className="text-xs text-gray-500">
										狀態：{reg.paymentStatus === 'PAID' ? '已繳費' : '未繳費'}
										{reg.checkedInAt ? ' · 已簽到' : ''}
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
