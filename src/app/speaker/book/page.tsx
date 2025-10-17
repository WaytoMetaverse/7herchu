'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function SpeakerBookPage() {
	const sp = useSearchParams()
	const eventId = sp.get('event') || ''
	const mode = sp.get('mode') || ''
	const qpPhone = sp.get('phone') || ''
  const from = sp.get('from') || ''
	const router = useRouter()
	const [form, setForm] = useState({
		name: '',
		phone: '',
		diet: 'meat',
		noBeef: false,
		noPork: false,
		mealCode: '',
		companyName: '',
		industry: '',
		bniChapter: '',
		invitedBy: '',
		pptUrl: '',
	})
	const [loading, setLoading] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [err, setErr] = useState<string | null>(null)
	const [existingId, setExistingId] = useState<string | null>(null)
    	const [eventDateLabel, setEventDateLabel] = useState<string>('')
    const [eventTitle, setEventTitle] = useState<string>('')
    const [eventLocation, setEventLocation] = useState<string>('')
    const [guestPriceLabel, setGuestPriceLabel] = useState<string>('')
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

	useEffect(() => {
		if (mode !== 'edit') return
		if (!qpPhone || !eventId) return
		const url = `/api/speaker/booking?phone=${encodeURIComponent(qpPhone)}&eventId=${encodeURIComponent(eventId)}`
		fetch(url)
			.then(res => res.json())
			.then(data => {
				const d = data?.data
				if (d) {
					setExistingId(d.id)
					setForm({
						name: d.name || '',
						phone: d.phone || qpPhone,
						diet: d.diet || 'meat',
						noBeef: !!d.noBeef,
						noPork: !!d.noPork,
						mealCode: d.mealCode || '',
						companyName: d.companyName || '',
						industry: d.industry || '',
						bniChapter: d.bniChapter || '',
						invitedBy: d.invitedBy || '',
						pptUrl: d.pptUrl || '',
					})
				}
			})
			.catch(() => {})
	}, [mode, qpPhone, eventId])

    useEffect(() => {
        if (!eventId) return
        Promise.all([
            fetch('/api/events').then(res => res.json()),
            fetch(`/api/menus?eventId=${eventId}`).then(res => res.json())
        ]).then(([eventList, menuData]) => {
            // 處理活動日期
            if (Array.isArray(eventList)) {
                const e = eventList.find((x): x is { id: string; startAt?: string | Date } => 
                    typeof (x as { id?: unknown }).id === 'string' && (x as { id?: string }).id === eventId
                )
                if (e?.startAt) {
                    // 解析為本地日期時間，避免時區偏移，並包含時間
                    let eventDate: Date
                    if (typeof e.startAt === 'string') {
                        const [datePart, timePart] = e.startAt.split('T')
                        const [year, month, day] = datePart.split('-').map((v) => parseInt(v))
                        let hh = 0, mm = 0
                        if (timePart) {
                            const [h, m] = timePart.split(':')
                            hh = parseInt(h)
                            mm = parseInt(m)
                        }
                        eventDate = new Date(year, (month || 1) - 1, day || 1, hh, mm)
                    } else {
                        eventDate = e.startAt
                    }
                    if (isNaN(eventDate.getTime())) {
                        setEventDateLabel('日期格式錯誤')
                    } else {
                        setEventDateLabel(format(eventDate, 'yyyy/MM/dd（EEEEE） HH:mm', { locale: zhTW }))
                    }
                } else {
                    setEventDateLabel('')
                }
            }
            
            // 處理餐點設定與標題地點
            if (menuData?.data) {
                setEventMenu(menuData.data)
            } else {
                setEventMenu(null)
            }
            // 也從事件列表補上標題與地點
            if (Array.isArray(eventList)) {
                const e = eventList.find((x): x is { 
                    id: string
                    title?: string
                    location?: string
                    startAt?: string | Date
                    type?: string
                    guestPriceCents?: number | null
                    bodGuestPriceCents?: number | null
                } => 
                    typeof (x as { id?: unknown }).id === 'string' && (x as { id?: string }).id === eventId
                )
                if (e) {
                    setEventTitle(e.title || '')
                    setEventLocation(e.location || '')
                    // 來賓費用：GENERAL/JOINT 固定 250；BOD 使用 bodGuestPriceCents；其他依設定
                    if (e.type === 'GENERAL' || e.type === 'JOINT') {
                        setGuestPriceLabel('來賓 250 元')
                    } else if (e.type === 'BOD' && e.bodGuestPriceCents && e.bodGuestPriceCents > 0) {
                        const amt = (e.bodGuestPriceCents / 100).toLocaleString('zh-TW')
                        setGuestPriceLabel(`來賓 ${amt} 元`)
                    } else if (e.guestPriceCents && e.guestPriceCents > 0) {
                        const amt = (e.guestPriceCents / 100).toLocaleString('zh-TW')
                        setGuestPriceLabel(`來賓 ${amt} 元`)
                    } else {
                        setGuestPriceLabel('')
                    }
                }
            }
        }).catch(() => {
            setEventDateLabel('')
            setEventMenu(null)
        })
    }, [eventId])

	async function submit() {
		setLoading(true)
		setErr(null)
		
		// 驗證必填欄位
		if (eventMenu?.hasMealService && !form.mealCode) {
			setErr('請選擇餐點')
			setLoading(false)
			return
		}
		
		const isUpdate = Boolean(existingId)
		const url = isUpdate ? '/api/speaker/booking' : '/api/speaker/book'
		const method = isUpdate ? 'PUT' : 'POST'
		
		// 準備提交數據
		const submitData = { ...form }
		if (eventMenu?.hasMealService) {
			// 如果有餐點服務，根據餐點代碼設定飲食類型
			if (form.mealCode === 'C') {
				submitData.diet = 'veg'
			} else {
				submitData.diet = 'meat'
			}
			// 清除傳統的飲食偏好設定
			submitData.noBeef = false
			submitData.noPork = false
		}
		
		const payload = isUpdate ? { id: existingId, ...submitData } : { eventId, ...submitData }
		const res = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
		})
		const data = await res.json()
		setLoading(false)
		if (!res.ok) {
			setErr(data.error || '提交失敗')
			return
		}
		// 依來源導向返回
		if (from === 'hall' && eventId) {
			router.push(`/hall/${eventId}`)
		} else if (from === 'calendar_event' && eventId) {
			router.push(`/calendar/${eventId}`)
		} else {
			router.push('/calendar')
		}
	}

	const Required = () => <span className="text-red-600">*</span>

	function goBack() {
		if (from === 'hall' && eventId) {
			router.push(`/hall/${eventId}`)
			return
		}
		if (from === 'calendar') {
			router.push('/calendar')
			return
		}
		if (from === 'calendar_event' && eventId) {
			router.push(`/calendar/${eventId}`)
			return
		}
		router.back()
	}

	async function uploadPpt(file: File) {
		setUploading(true)
		setErr(null)
		try {
			const allowed = [
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'application/vnd.ms-powerpoint',
				'application/pdf',
			]
			if (!allowed.includes(file.type)) {
				setErr('請上傳 PPT/PPTX 或 PDF')
				setUploading(false)
				return
			}
		if (file.size > 10 * 1024 * 1024) {
			setErr('檔案過大，請小於 10MB，超過請使用雲端連結')
			setUploading(false)
			return
		}
			const fd = new FormData()
			fd.append('file', file)
			const res = await fetch('/api/upload', { method: 'POST', body: fd })
			const data = await res.json()
			if (!res.ok || !data?.url) throw new Error(data?.error || '上傳失敗')
			setForm(v => ({ ...v, pptUrl: data.url }))
		} catch (e) {
			setErr((e as Error).message)
		} finally {
			setUploading(false)
		}
	}

	return (
		<div className="max-w-lg mx-auto p-4 space-y-3">
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">講師預約</h1>
				{(eventTitle || eventDateLabel || eventLocation || guestPriceLabel) && (
					<div className="text-gray-600">
						{eventTitle && <div className="font-medium">{eventTitle}</div>}
						{eventDateLabel && <div className="text-sm">{eventDateLabel}</div>}
						{eventLocation && <div className="text-sm">{eventLocation}</div>}
						{guestPriceLabel && <div className="text-sm text-gray-800">費用：{guestPriceLabel}</div>}
					</div>
				)}
			</div>
			{err && <div className="text-red-600 text-sm">{err}</div>}
			<div>
				<label>姓名<Required /></label>
				<input required value={form.name} onChange={(e) => setForm(v => ({...v, name: e.target.value}))} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
			</div>
			<div>
				<label>手機<Required /></label>
				<input required value={form.phone} onChange={(e) => setForm(v => ({...v, phone: e.target.value}))} disabled={Boolean(existingId)} maxLength={10} pattern="\d{10}" className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50" />
			</div>
			<div>
				<label>公司名稱<Required /></label>
				<input required value={form.companyName} onChange={(e) => setForm(v => ({...v, companyName: e.target.value}))} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
			</div>
			<div>
				<label>產業<Required /></label>
				<input required value={form.industry} onChange={(e) => setForm(v => ({...v, industry: e.target.value}))} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
			</div>
			<div>
				<label>BNI 分會（選填）</label>
				<input value={form.bniChapter} onChange={(e) => setForm(v => ({...v, bniChapter: e.target.value}))} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
			</div>
			<div>
				<label>邀請人<Required /></label>
				<input required value={form.invitedBy} onChange={(e) => setForm(v => ({...v, invitedBy: e.target.value}))} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
			</div>
			<div className="space-y-2">
				<label>PPT或連結（之後可用手機號碼登入補件）</label>
				<input placeholder="https://..." value={form.pptUrl} onChange={(e) => setForm(v => ({...v, pptUrl: e.target.value}))} className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
				<div className="flex items-center gap-2 text-sm">
					<input
						type="file"
						accept=".ppt,.pptx,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf"
						onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPpt(f) }}
						disabled={uploading}
					/>
					{uploading && <span className="text-blue-600 font-medium">📤 上傳中，請稍候...</span>}
					{form.pptUrl && !uploading && <span className="text-green-600 font-medium">✅ 已上傳完成</span>}
					{form.pptUrl ? <a href={form.pptUrl} target="_blank" className="text-blue-600 underline ml-2">查看檔案</a> : null}
				</div>
				<div className="text-xs text-gray-500">
					💡 檔案限制：10MB內，超過請使用雲端連結（Google Drive、OneDrive等）
				</div>
			</div>
			{/* 餐點選擇 - 如果有設定餐點服務 */}
			{eventMenu?.hasMealService ? (
				<div>
					<h3 className="font-medium mb-3">餐點選擇<Required /></h3>
					<div className="space-y-3">
						{/* A餐點選項 */}
						{eventMenu.mealCodeA && (
							<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									name="mealCode"
									value="A"
									checked={form.mealCode === 'A'}
									onChange={(e) => setForm(v => ({...v, mealCode: e.target.value}))}
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
						)}

						{/* B餐點選項 */}
						{eventMenu.mealCodeB && (
							<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									name="mealCode"
									value="B"
									checked={form.mealCode === 'B'}
									onChange={(e) => setForm(v => ({...v, mealCode: e.target.value}))}
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
						)}

						{/* C餐點選項 */}
						{eventMenu.mealCodeC && (
							<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
								<input
									type="radio"
									name="mealCode"
									value="C"
									checked={form.mealCode === 'C'}
									onChange={(e) => setForm(v => ({...v, mealCode: e.target.value}))}
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
						)}
					</div>
				</div>
			) : (
				/* 傳統飲食偏好選擇 - 只在沒有餐點服務時顯示 */
				<>
					<div className="flex items-center gap-4">
						<label className="flex items-center gap-2 text-sm">
							<input type="radio" name="diet" required checked={form.diet === 'meat'} onChange={() => setForm((v) => ({ ...v, diet: 'meat' }))} />
							葷食<Required />
						</label>
						<label className="flex items-center gap-2 text-sm">
							<input type="radio" name="diet" required checked={form.diet === 'veg'} onChange={() => setForm((v) => ({ ...v, diet: 'veg' }))} />
							素食<Required />
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
			<div className="flex items-center gap-3">
				<Button disabled={loading || uploading} onClick={submit}>
					{loading ? '送出中…' : uploading ? '上傳中，請稍候...' : '送出預約'}
				</Button>
				<Button onClick={goBack} variant="ghost">取消</Button>
			</div>
		</div>
	)
} 