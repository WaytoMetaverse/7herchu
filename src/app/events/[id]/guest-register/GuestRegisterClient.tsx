'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface GuestRegisterClientProps {
	eventId: string
	invitationCardUrl?: string | null
}

export default function GuestRegisterClient({ eventId, invitationCardUrl }: GuestRegisterClientProps) {
	const [event, setEvent] = useState<{
		id: string
		title: string
		startAt: string
		location: string
	} | null>(null)
	const [menu, setMenu] = useState<{
		items: {
			id: string
			code: string
			name: string
			isVegetarian: boolean
			containsBeef: boolean
			containsPork: boolean
		}[]
	} | null>(null)
	const [form, setForm] = useState({
		name: '',
		phone: '',
		companyName: '',
		industry: '',
		bniChapter: '',
		invitedBy: '',
		mealCode: '',
		diet: 'meat' as 'meat' | 'veg',
		noBeef: false,
		noPork: false,
	})
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const [showCard, setShowCard] = useState(false)
	const router = useRouter()

	// 載入活動資訊
	useEffect(() => {
		if (!eventId) return
		
		Promise.all([
			fetch(`/api/events?id=${eventId}`).then(res => res.json()),
			fetch(`/api/menus?eventId=${eventId}`).then(res => res.json())
		]).then(([eventData, menuData]) => {
			if (eventData?.data) setEvent(eventData.data)
			if (menuData?.data) setMenu(menuData.data)
		}).catch(() => {
			setErr('載入活動資訊失敗')
		})
	}, [eventId])

	async function submit() {
		setLoading(true)
		setErr(null)

		// 驗證必填欄位
		if (!form.name || !form.phone || !form.companyName || !form.industry || !form.invitedBy) {
			setErr('請填寫所有必填欄位')
			setLoading(false)
			return
		}

		// 如果有餐點服務，檢查是否選擇餐點
		if (menu?.items && menu.items.length > 0 && !form.mealCode) {
			setErr('請選擇餐點')
			setLoading(false)
			return
		}

		// 驗證手機號碼
		if (!/^\d{10}$/.test(form.phone)) {
			setErr('請輸入正確的10碼手機號碼')
			setLoading(false)
			return
		}

		const res = await fetch('/api/guest-register', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ eventId, ...form }),
		})
		
		const data = await res.json()
		setLoading(false)
		
		if (!res.ok) {
			setErr(data.error || '報名失敗')
			return
		}

		// 報名成功，導向成功頁面
		router.push(`/events/${eventId}/guest-success?phone=${encodeURIComponent(form.phone)}`)
	}

	const Required = () => <span className="text-red-600">*</span>

	if (!event) {
		return (
			<div className="max-w-lg mx-auto p-4 space-y-4">
				<div className="text-center">
					{err ? (
						<div className="text-red-600">{err}</div>
					) : (
						<div>載入中...</div>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			{/* 邀請卡顯示 */}
			{invitationCardUrl && (
				<div className="bg-white rounded-lg border overflow-hidden">
					{!showCard ? (
						<button 
							onClick={() => setShowCard(true)}
							className="w-full p-4 text-center hover:bg-gray-50 transition-colors"
						>
							<div className="text-blue-600 font-medium">點擊查看邀請卡</div>
							<div className="text-xs text-gray-500 mt-1">長按圖片可儲存</div>
						</button>
					) : (
						<div className="p-4">
							<div className="flex justify-between items-center mb-3">
								<h3 className="font-medium text-gray-700">邀請卡</h3>
								<button 
									onClick={() => setShowCard(false)}
									className="text-gray-400 hover:text-gray-600"
								>
									✕
								</button>
							</div>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img 
								src={invitationCardUrl} 
								alt="邀請卡"
								className="w-full rounded-lg shadow-sm"
								onContextMenu={(e) => {
									// 允許右鍵儲存圖片
									return true
								}}
							/>
							<div className="text-xs text-gray-500 text-center mt-2">
								長按圖片可儲存到手機
							</div>
						</div>
					)}
				</div>
			)}

			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">來賓報名</h1>
				<div className="text-gray-600">
					<div className="font-medium">{event.title}</div>
					<div className="text-sm">
						{format(new Date(event.startAt), 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW })}
					</div>
					<div className="text-sm">{event.location}</div>
				</div>
			</div>

			{err && <div className="text-red-600 text-sm text-center">{err}</div>}

			<div className="space-y-4">
				<div>
					<label>姓名<Required /></label>
					<input 
						required 
						value={form.name} 
						onChange={(e) => setForm(v => ({...v, name: e.target.value}))} 
					/>
				</div>
				
				<div>
					<label>手機<Required /></label>
					<input 
						required 
						value={form.phone} 
						onChange={(e) => setForm(v => ({...v, phone: e.target.value}))} 
						maxLength={10} 
						pattern="\d{10}"
						placeholder="請輸入10碼手機號碼"
					/>
				</div>
				
				<div>
					<label>公司名稱<Required /></label>
					<input 
						required 
						value={form.companyName} 
						onChange={(e) => setForm(v => ({...v, companyName: e.target.value}))} 
					/>
				</div>
				
				<div>
					<label>產業<Required /></label>
					<input 
						required 
						value={form.industry} 
						onChange={(e) => setForm(v => ({...v, industry: e.target.value}))} 
					/>
				</div>
				
				<div>
					<label>BNI 分會（選填）</label>
					<input 
						value={form.bniChapter} 
						onChange={(e) => setForm(v => ({...v, bniChapter: e.target.value}))} 
					/>
				</div>
				
				<div>
					<label>邀請人<Required /></label>
					<input 
						required 
						value={form.invitedBy} 
						onChange={(e) => setForm(v => ({...v, invitedBy: e.target.value}))} 
					/>
				</div>

				{/* 菜單選擇 */}
				{menu?.items && menu.items.length > 0 && (
					<div>
						<label>菜單選擇<Required /></label>
						<div className="space-y-2 mt-2">
							{menu.items.map((item) => (
								<label key={item.id} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
									<input
										type="radio"
										name="mealCode"
										value={item.code}
										checked={form.mealCode === item.code}
										onChange={(e) => setForm(v => ({...v, mealCode: e.target.value}))}
										required
										className="mt-1"
									/>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span className="font-medium">選項 {item.code}</span>
											{item.isVegetarian && (
												<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">素食</span>
											)}
											{!item.isVegetarian && item.containsBeef && (
												<span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-xs">含牛</span>
											)}
											{!item.isVegetarian && item.containsPork && (
												<span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">含豬</span>
											)}
										</div>
										<div className="text-gray-700">{item.name}</div>
									</div>
								</label>
							))}
						</div>
					</div>
				)}

				{/* 飲食偏好 - 只在沒有餐點服務時顯示 */}
				{(!menu?.items || menu.items.length === 0) && (
					<div>
						<h3 className="font-medium mb-3">飲食偏好</h3>
						<div className="space-y-2">
							<label className="flex items-center gap-2">
								<input 
									type="radio" 
									name="diet"
									value="meat"
									checked={form.diet === 'meat'}
									onChange={(e) => setForm(v => ({...v, diet: e.target.value as 'meat' | 'veg'}))}
								/>
								<span className="text-sm">葷食</span>
							</label>
							<label className="flex items-center gap-2">
								<input 
									type="radio" 
									name="diet"
									value="veg"
									checked={form.diet === 'veg'}
									onChange={(e) => setForm(v => ({...v, diet: e.target.value as 'meat' | 'veg'}))}
								/>
								<span className="text-sm">素食</span>
							</label>
							<label className="flex items-center gap-2">
								<input 
									type="checkbox" 
									checked={form.noBeef}
									onChange={(e) => setForm(v => ({...v, noBeef: e.target.checked}))}
								/>
								<span className="text-sm">不吃牛肉</span>
							</label>
							<label className="flex items-center gap-2">
								<input 
									type="checkbox" 
									checked={form.noPork}
									onChange={(e) => setForm(v => ({...v, noPork: e.target.checked}))}
								/>
								<span className="text-sm">不吃豬肉</span>
							</label>
						</div>
					</div>
				)}
			</div>

			<div className="flex items-center gap-3">
				<Button 
					disabled={loading || !form.name || !form.phone || !form.companyName || !form.industry || !form.invitedBy || (menu?.items && menu.items.length > 0 && !form.mealCode)} 
					onClick={submit}
				>
					{loading ? '送出中…' : '送出報名'}
				</Button>
				<Button onClick={() => router.back()} variant="ghost">取消</Button>
			</div>

			<div className="text-xs text-gray-500 text-center">
				可用手機號碼查詢報名狀況
			</div>
		</div>
	)
}
