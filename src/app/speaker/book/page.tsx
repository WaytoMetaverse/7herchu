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
        fetch('/api/events')
            .then(res => res.json())
            .then((list: unknown) => {
                if (!Array.isArray(list)) { setEventDateLabel(''); return }
                const e = list.find((x): x is { id: string; startAt?: string | Date } => typeof (x as { id?: unknown }).id === 'string' && (x as { id?: string }).id === eventId)
                if (e?.startAt) {
                    setEventDateLabel(format(new Date(e.startAt), 'yyyy/MM/dd（EEEEE）', { locale: zhTW }))
                } else {
                    setEventDateLabel('')
                }
            })
            .catch(() => setEventDateLabel(''))
    }, [eventId])

	async function submit() {
		setLoading(true)
		setErr(null)
		const isUpdate = Boolean(existingId)
		const url = isUpdate ? '/api/speaker/booking' : '/api/speaker/book'
		const method = isUpdate ? 'PUT' : 'POST'
		const payload = isUpdate ? { id: existingId, ...form } : { eventId, ...form }
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
				<label className="block text-sm mb-1">姓名<Required /></label>
				<input className="border rounded w-full px-3 py-2" required value={form.name} onChange={(e) => setForm(v => ({...v, name: e.target.value}))} />
			</div>
			<div>
				<label className="block text-sm mb-1">手機<Required /></label>
				<input className="border rounded w-full px-3 py-2" required value={form.phone} onChange={(e) => setForm(v => ({...v, phone: e.target.value}))} disabled={Boolean(existingId)} maxLength={10} pattern="\d{10}" />
			</div>
			<div>
				<label className="block text-sm mb-1">公司名稱<Required /></label>
				<input className="border rounded w-full px-3 py-2" required value={form.companyName} onChange={(e) => setForm(v => ({...v, companyName: e.target.value}))} />
			</div>
			<div>
				<label className="block text-sm mb-1">產業<Required /></label>
				<input className="border rounded w-full px-3 py-2" required value={form.industry} onChange={(e) => setForm(v => ({...v, industry: e.target.value}))} />
			</div>
			<div>
				<label className="block text-sm mb-1">BNI 分會（選填）</label>
				<input className="border rounded w-full px-3 py-2" value={form.bniChapter} onChange={(e) => setForm(v => ({...v, bniChapter: e.target.value}))} />
			</div>
			<div>
				<label className="block text-sm mb-1">邀請人<Required /></label>
				<input className="border rounded w-full px-3 py-2" required value={form.invitedBy} onChange={(e) => setForm(v => ({...v, invitedBy: e.target.value}))} />
			</div>
			<div className="space-y-2">
				<label className="block text-sm">PPT或連結（之後可用手機號碼登入補件）</label>
				<input className="border rounded w-full px-3 py-2" placeholder="https://..." value={form.pptUrl} onChange={(e) => setForm(v => ({...v, pptUrl: e.target.value}))} />
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
			<div className="flex items-center gap-3">
				<Button disabled={loading} onClick={submit}>{loading ? '送出中…' : '送出預約'}</Button>
				<Button as={Link} href="/calendar" variant="ghost">取消</Button>
			</div>
		</div>
	)
} 