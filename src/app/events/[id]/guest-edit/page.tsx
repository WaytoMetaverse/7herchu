'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function GuestEditPage({ params }: { params: Promise<{ id: string }> }) {
	const [eventId, setEventId] = useState<string>('')
	
	// 處理 async params
	useEffect(() => {
		params.then(p => setEventId(p.id))
	}, [params])
	const sp = useSearchParams()
	const mode = sp.get('mode') || ''
	const qpPhone = sp.get('phone') || ''
	const router = useRouter()
	
	const [form, setForm] = useState({
		name: '',
		phone: '',
		companyName: '',
		industry: '',
		guestType: '' as '' | 'PANSHI' | 'OTHER_BNI' | 'NON_BNI',
		bniChapter: '',
		invitedBy: '',
		diet: 'meat',
		noBeef: false,
		noPork: false,
		mealCode: '',
	})
	const [loading, setLoading] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const [existingId, setExistingId] = useState<string | null>(null)
	const [eventDateLabel, setEventDateLabel] = useState<string>('')
	const [eventTitle, setEventTitle] = useState<string>('')
	const [eventMenu, setEventMenu] = useState<{
		hasMealService: boolean
		mealCodeA?: string
		mealCodeB?: string
		mealCodeC?: string
		mealAHasBeef: boolean
		mealAHasPork: boolean
		mealBHasBeef: boolean
		mealBHasPork: boolean
	} | null>(null)

	// 載入現有報名資料（編輯模式）
	useEffect(() => {
		if (mode !== 'edit') return
		if (!qpPhone || !eventId) return
		
		const url = `/api/guest/booking?phone=${encodeURIComponent(qpPhone)}&eventId=${encodeURIComponent(eventId)}`
		fetch(url)
			.then(res => res.json())
			.then(data => {
				const d = data?.data
				if (d) {
					setExistingId(d.id)
					setForm({
						name: d.name || '',
						phone: d.phone || qpPhone,
						companyName: d.companyName || '',
						industry: d.industry || '',
						guestType: d.guestType || '',
						bniChapter: d.bniChapter || '',
						invitedBy: d.invitedBy || '',
						diet: d.diet || 'meat',
						noBeef: !!d.noBeef,
						noPork: !!d.noPork,
						mealCode: d.mealCode || '',
					})
				}
			})
			.catch(() => {})
	}, [mode, qpPhone, eventId])

	// 載入活動資訊和餐點設定
	useEffect(() => {
		if (!eventId) return
		
		Promise.all([
			fetch('/api/events').then(res => res.json()),
			fetch(`/api/menus?eventId=${eventId}`).then(res => res.json())
		]).then(([eventList, menuData]) => {
			// 處理活動資訊
			if (Array.isArray(eventList)) {
				const e = eventList.find((x): x is { id: string; title?: string; startAt?: string | Date } => 
					typeof (x as { id?: unknown }).id === 'string' && (x as { id?: string }).id === eventId
				)
				if (e) {
					setEventTitle(e.title || '')
					if (e.startAt) {
						// 處理時區問題
						let eventDate: Date
						if (typeof e.startAt === 'string') {
							const [year, month, day] = e.startAt.split('T')[0].split('-')
							eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
						} else {
							eventDate = e.startAt
						}
						
						if (isNaN(eventDate.getTime())) {
							setEventDateLabel('日期格式錯誤')
						} else {
							setEventDateLabel(format(eventDate, 'yyyy/MM/dd（EEEEE）', { locale: zhTW }))
						}
					}
				}
			}

			// 處理餐點設定
			if (menuData?.ok && menuData.data) {
				setEventMenu({
					hasMealService: !!menuData.data.hasMealService,
					mealCodeA: menuData.data.mealCodeA || 'A餐點',
					mealCodeB: menuData.data.mealCodeB || 'B餐點',
					mealCodeC: menuData.data.mealCodeC || 'C餐點',
					mealAHasBeef: !!menuData.data.mealAHasBeef,
					mealAHasPork: !!menuData.data.mealAHasPork,
					mealBHasBeef: !!menuData.data.mealBHasBeef,
					mealBHasPork: !!menuData.data.mealBHasPork,
				})
			} else {
				setEventMenu({
					hasMealService: false,
					mealCodeA: 'A餐點',
					mealCodeB: 'B餐點',
					mealCodeC: 'C餐點',
					mealAHasBeef: false,
					mealAHasPork: false,
					mealBHasBeef: false,
					mealBHasPork: false,
				})
			}
		}).catch(() => {})
	}, [eventId])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setErr(null)

		// 驗證必填欄位
		if (!form.name || !form.phone || !form.companyName || !form.industry || !form.guestType || !form.invitedBy) {
			setErr('請填寫所有必填欄位')
			setLoading(false)
			return
		}

		// 驗證手機號碼
		if (!/^\d{10}$/.test(form.phone)) {
			setErr('請輸入正確的10碼手機號碼')
			setLoading(false)
			return
		}

		// 如果有餐點服務，驗證餐點選擇
		if (eventMenu?.hasMealService && !form.mealCode) {
			setErr('請選擇餐點')
			setLoading(false)
			return
		}

		try {
			if (mode === 'edit' && existingId) {
				// 更新現有報名
				const res = await fetch('/api/guest/booking', {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						id: existingId,
						...form
					})
				})

				const data = await res.json()
				if (!res.ok) {
					setErr(data.error || '更新失敗')
					setLoading(false)
					return
				}

				// 更新成功，跳轉到成功頁面
				router.push(`/events/${eventId}/guest-success?phone=${encodeURIComponent(form.phone)}&updated=true`)
			} else {
				setErr('編輯模式錯誤')
				setLoading(false)
			}
		} catch {
			setErr('網路錯誤，請稍後再試')
			setLoading(false)
		}
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-6">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">編輯來賓報名</h1>
				{eventTitle && <h2 className="text-lg text-gray-700">{eventTitle}</h2>}
				{eventDateLabel && <p className="text-sm text-gray-600">{eventDateLabel}</p>}
			</div>

			{err && <div className="text-red-600 text-sm text-center">{err}</div>}

			<form onSubmit={handleSubmit} className="space-y-4">
				{/* 基本資料 */}
				<div>
					<label>姓名 *</label>
					<input
						required
						value={form.name}
						onChange={(e) => setForm(v => ({ ...v, name: e.target.value }))}
					/>
				</div>

				<div>
					<label>手機號碼 *</label>
					<input
						required
						inputMode="numeric"
						maxLength={10}
						pattern="\d{10}"
						value={form.phone}
						onChange={(e) => setForm(v => ({ ...v, phone: e.target.value }))}
						disabled={mode === 'edit'}
					/>
				</div>

				<div>
					<label>公司名稱 *</label>
					<input
						required
						value={form.companyName}
						onChange={(e) => setForm(v => ({ ...v, companyName: e.target.value }))}
					/>
				</div>

			<div>
				<label>產業別 *</label>
				<input
					required
					value={form.industry}
					onChange={(e) => setForm(v => ({ ...v, industry: e.target.value }))}
				/>
			</div>

			{/* 來賓類型 - 不顯示標籤 */}
			<div>
				<div className="flex gap-3 justify-start">
					<label className="flex items-center gap-2 cursor-pointer">
						<input 
							type="radio"
							name="guestType"
							value="PANSHI"
							checked={form.guestType === 'PANSHI'}
							onChange={(e) => setForm(v => ({...v, guestType: e.target.value as 'PANSHI'}))}
							className="w-4 h-4 text-blue-600"
							required
						/>
						<span className="text-sm sm:text-base">磐石分會</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input 
							type="radio"
							name="guestType"
							value="OTHER_BNI"
							checked={form.guestType === 'OTHER_BNI'}
							onChange={(e) => setForm(v => ({...v, guestType: e.target.value as 'OTHER_BNI'}))}
							className="w-4 h-4 text-blue-600"
							required
						/>
						<span className="text-sm sm:text-base">其他分會</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input 
							type="radio"
							name="guestType"
							value="NON_BNI"
							checked={form.guestType === 'NON_BNI'}
							onChange={(e) => setForm(v => ({...v, guestType: e.target.value as 'NON_BNI'}))}
							className="w-4 h-4 text-blue-600"
							required
						/>
						<span className="text-sm sm:text-base">非BNI</span>
					</label>
				</div>
			</div>

			<div>
				<label>BNI分會</label>
				<input
					value={form.bniChapter}
					onChange={(e) => setForm(v => ({ ...v, bniChapter: e.target.value }))}
				/>
			</div>

				<div>
					<label>邀請人 *</label>
					<input
						required
						value={form.invitedBy}
						onChange={(e) => setForm(v => ({ ...v, invitedBy: e.target.value }))}
					/>
				</div>

				{/* 餐點選擇 */}
				{eventMenu?.hasMealService ? (
					<div>
						<h3 className="font-medium mb-3">餐點選擇<span className="text-red-600">*</span></h3>
						<div className="space-y-3">
							{/* A 餐 */}
							<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									name="mealCode"
									value="A"
									checked={form.mealCode === 'A'}
									onChange={(e) => setForm(v => ({ ...v, mealCode: e.target.value }))}
									required
									className="mt-1"
								/>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="font-medium">選項 A</span>
										{eventMenu.mealAHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-xs">含牛</span>}
										{eventMenu.mealAHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">含豬</span>}
									</div>
									<div className="text-gray-700">{eventMenu.mealCodeA}</div>
								</div>
							</label>

							{/* B 餐 */}
							<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									name="mealCode"
									value="B"
									checked={form.mealCode === 'B'}
									onChange={(e) => setForm(v => ({ ...v, mealCode: e.target.value }))}
									required
									className="mt-1"
								/>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="font-medium">選項 B</span>
										{eventMenu.mealBHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded text-xs">含牛</span>}
										{eventMenu.mealBHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded text-xs">含豬</span>}
									</div>
									<div className="text-gray-700">{eventMenu.mealCodeB}</div>
								</div>
							</label>

							{/* C 餐 */}
							<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									name="mealCode"
									value="C"
									checked={form.mealCode === 'C'}
									onChange={(e) => setForm(v => ({ ...v, mealCode: e.target.value }))}
									required
									className="mt-1"
								/>
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="font-medium">選項 C</span>
										<span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">素食</span>
									</div>
									<div className="text-gray-700">{eventMenu.mealCodeC}</div>
								</div>
							</label>
						</div>
					</div>
				) : (
					/* 傳統飲食偏好（無餐點設定時） */
					<>
						<div className="flex items-center gap-4">
							<label className="flex items-center gap-2 text-sm">
								<input type="radio" name="diet" required checked={form.diet === 'meat'} onChange={() => setForm((v) => ({ ...v, diet: 'meat' }))} />
								葷食<span className="text-red-600">*</span>
							</label>
							<label className="flex items-center gap-2 text-sm">
								<input type="radio" name="diet" required checked={form.diet === 'veg'} onChange={() => setForm((v) => ({ ...v, diet: 'veg' }))} />
								素食<span className="text-red-600">*</span>
							</label>
						</div>
						<div className="flex items-center gap-4 text-sm">
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={form.noBeef} onChange={(e) => setForm((v) => ({ ...v, noBeef: e.target.checked }))} />
								不吃牛
							</label>
							<label className="flex items-center gap-2">
								<input type="checkbox" checked={form.noPork} onChange={(e) => setForm((v) => ({ ...v, noPork: e.target.checked }))} />
								不吃豬
							</label>
						</div>
					</>
				)}

				<div className="flex items-center gap-3 pt-4">
					<Button type="submit" disabled={loading}>
						{loading ? '更新中…' : '更新報名資料'}
					</Button>
					<Button as={Link} href="/mobile-query" variant="ghost">取消</Button>
				</div>
			</form>
		</div>
	)
}
