'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export default function SpeakerBookPage() {
	const sp = useSearchParams()
	const eventId = sp.get('event') || ''
	const mode = sp.get('mode') || ''
	const qpPhone = sp.get('phone') || ''
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
                    // 處理時區問題：直接使用原始日期字符串，避免時區轉換
                    let eventDate: Date
                    if (typeof e.startAt === 'string') {
                        // 如果是字符串，直接解析為本地日期
                        const [year, month, day] = e.startAt.split('T')[0].split('-')
                        eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
                    } else {
                        // 如果是 Date 對象，直接使用
                        eventDate = e.startAt
                    }
                    
                    if (isNaN(eventDate.getTime())) {
                        setEventDateLabel('日期格式錯誤')
                    } else {
                        setEventDateLabel(format(eventDate, 'yyyy/MM/dd（EEEEE）', { locale: zhTW }))
                    }
                } else {
                    setEventDateLabel('')
                }
            }
            
            // 處理餐點設定
            if (menuData?.data) {
                setEventMenu(menuData.data)
            } else {
                setEventMenu(null)
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
		router.push('/calendar')
	}

	const Required = () => <span className="text-red-600">*</span>

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
			if (file.size > 50 * 1024 * 1024) {
				setErr('檔案過大，請小於 50MB')
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
			{eventDateLabel && <div className="text-sm text-gray-600">日期：{eventDateLabel}</div>}
			<h1 className="text-xl font-semibold">講師預約</h1>
			{err && <div className="text-red-600 text-sm">{err}</div>}
			<div>
				<label>姓名<Required /></label>
				<input required value={form.name} onChange={(e) => setForm(v => ({...v, name: e.target.value}))} />
			</div>
			<div>
				<label>手機<Required /></label>
				<input required value={form.phone} onChange={(e) => setForm(v => ({...v, phone: e.target.value}))} disabled={Boolean(existingId)} maxLength={10} pattern="\d{10}" />
			</div>
			<div>
				<label>公司名稱<Required /></label>
				<input required value={form.companyName} onChange={(e) => setForm(v => ({...v, companyName: e.target.value}))} />
			</div>
			<div>
				<label>產業<Required /></label>
				<input required value={form.industry} onChange={(e) => setForm(v => ({...v, industry: e.target.value}))} />
			</div>
			<div>
				<label>BNI 分會（選填）</label>
				<input value={form.bniChapter} onChange={(e) => setForm(v => ({...v, bniChapter: e.target.value}))} />
			</div>
			<div>
				<label>邀請人<Required /></label>
				<input required value={form.invitedBy} onChange={(e) => setForm(v => ({...v, invitedBy: e.target.value}))} />
			</div>
			<div className="space-y-2">
				<label>PPT或連結（之後可用手機號碼登入補件）</label>
				<input placeholder="https://..." value={form.pptUrl} onChange={(e) => setForm(v => ({...v, pptUrl: e.target.value}))} />
				<div className="flex items-center gap-2 text-sm">
					<input
						type="file"
						accept=".ppt,.pptx,.pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,application/pdf"
						onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPpt(f) }}
					/>
					{uploading ? <span className="text-gray-600">上傳中…</span> : null}
					{form.pptUrl ? <a href={form.pptUrl} target="_blank" className="text-blue-600 underline">已上傳/連結</a> : null}
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
									</div>
									<div className="text-gray-700">{eventMenu.mealCodeA}</div>
									<div className="text-xs text-gray-500 mt-1 space-x-2">
										{eventMenu.mealAHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
										{eventMenu.mealAHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
									</div>
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
									</div>
									<div className="text-gray-700">{eventMenu.mealCodeB}</div>
									<div className="text-xs text-gray-500 mt-1 space-x-2">
										{eventMenu.mealBHasBeef && <span className="px-1 py-0.5 bg-red-100 text-red-600 rounded">含牛</span>}
										{eventMenu.mealBHasPork && <span className="px-1 py-0.5 bg-orange-100 text-orange-600 rounded">含豬</span>}
									</div>
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
				<Button disabled={loading} onClick={submit}>{loading ? '送出中…' : '送出預約'}</Button>
				<Button as={Link} href="/calendar" variant="ghost">取消</Button>
			</div>
		</div>
	)
} 