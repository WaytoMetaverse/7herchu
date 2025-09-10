"use client"
import { useRef, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import SubcategoryPicker from '@/components/cards/SubcategoryPicker'

const PRESET = [
  { label: '金融租賃', value: 'FINANCE' },
  { label: '開發買賣', value: 'DEVELOPMENT' },
  { label: '規畫設計', value: 'DESIGN' },
  { label: '整地建築', value: 'CONSTRUCTION' },
  { label: '建材裝修', value: 'MATERIALS' },
  { label: '管理專業', value: 'MANAGEMENT' },
]

export default function CardScanPage() {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [rotatedBlob, setRotatedBlob] = useState<Blob | null>(null)
  const [category, setCategory] = useState('')
  const [subs, setSubs] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '', company: '', title: '', email: '', phone: '', address: '', website: '', notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [checkingPhone, setCheckingPhone] = useState(false)
  const [phoneExists, setPhoneExists] = useState<string | null>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setImageFile(f)
    if (f) {
      const url = URL.createObjectURL(f)
      setImagePreview(url)
      setRotatedBlob(null)
    } else {
      setImagePreview(null)
      setRotatedBlob(null)
    }
  }

  async function rotateLeft() {
    if (!imagePreview) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imagePreview
    await new Promise(res => { img.onload = () => res(null) })
    const canvas = document.createElement('canvas')
    canvas.width = img.height
    canvas.height = img.width
    const ctx = canvas.getContext('2d')!
    ctx.translate(0, canvas.height)
    ctx.rotate(-Math.PI / 2)
    ctx.drawImage(img, 0, 0)
    await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92)).then(b => {
      if (b) {
        setRotatedBlob(b)
        setImagePreview(URL.createObjectURL(b))
      }
    })
  }

  async function save() {
    setLoading(true)
    setErr(null)
    try {
      let imageUrl: string | undefined
      const fileToUpload = rotatedBlob ? new File([rotatedBlob], imageFile?.name || 'card.jpg', { type: rotatedBlob.type || 'image/jpeg' }) : imageFile
      if (fileToUpload) {
        const fd = new FormData()
        fd.append('file', fileToUpload)
        const up = await fetch('/api/upload', { method: 'POST', body: fd })
        const upData = await up.json()
        if (!up.ok) throw new Error(upData.error || '上傳失敗')
        imageUrl = upData.url
      }
      const res = await fetch('/api/cards/save', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, imageData: imageUrl, category, subcategories: subs })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '保存失敗')
      window.location.href = '/cards'
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  async function aiExtract() {
    if (!imageFile && !rotatedBlob) {
      setErr('請先選擇名片圖片')
      return
    }
    setAiLoading(true)
    setErr(null)
    try {
      // 先上傳圖片取得 URL
      const fd = new FormData()
      const fileToUpload = rotatedBlob ? new File([rotatedBlob], imageFile?.name || 'card.jpg', { type: rotatedBlob.type || 'image/jpeg' }) : imageFile!
      fd.append('file', fileToUpload)
      const up = await fetch('/api/upload', { method: 'POST', body: fd })
      const upData = await up.json()
      if (!up.ok) throw new Error(upData.error || '上傳失敗')
      const imageUrl: string = upData.url
      // 呼叫 AI 端點
      const res = await fetch('/api/cards/ocr', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imageUrl }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI 解析失敗')
      const r = data.result as typeof form
      setForm(v => ({
        ...v,
        name: r.name || v.name,
        company: r.company || v.company,
        title: r.title || v.title,
        email: r.email || v.email,
        phone: r.phone || v.phone,
        address: r.address || v.address,
        website: r.website || v.website,
        notes: r.notes || v.notes,
      }))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '發生錯誤')
    } finally {
      setAiLoading(false)
    }
  }

  async function checkPhoneUnique(phone: string) {
    if (!phone) { setPhoneExists(null); return }
    setCheckingPhone(true)
    try {
      const res = await fetch(`/api/cards/phone?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()
      setPhoneExists(data.exists ? phone : null)
    } catch {
      // ignore
    } finally {
      setCheckingPhone(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold truncate">新增名片</h1>
        <Button as={Link} href="/cards" variant="ghost" className="whitespace-nowrap">返回名片庫</Button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">名片圖片</label>
            <div className="flex gap-2 mb-3">
              <Button 
                onClick={() => cameraRef.current?.click()}
                variant="outline"
                size="sm"
              >
                📷 拍照
              </Button>
              <Button 
                onClick={() => fileRef.current?.click()}
                variant="outline"
                size="sm"
              >
                📁 上傳檔案
              </Button>
            </div>
            <input 
              ref={cameraRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              onChange={onPick}
              className="hidden"
            />
            <input 
              ref={fileRef} 
              type="file" 
              accept="image/*" 
              onChange={onPick}
              className="hidden"
            />
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="預覽" className="mt-2 w-full h-48 object-contain rounded border" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={aiExtract} variant="secondary" size="sm" disabled={(!imageFile && !rotatedBlob) || aiLoading}>{aiLoading ? 'AI 解析中…' : 'AI 辨識'}</Button>
            <Button onClick={rotateLeft} variant="outline" size="sm">照片旋轉</Button>
          </div>
          <div className="text-xs text-gray-500">*若名片方向不正，請點擊旋轉按鈕，調整至正確方向以利辨識。</div>
          <label>主類
            <select value={category} onChange={(e)=>setCategory(e.target.value)}>
              <option value="">請選擇</option>
              {PRESET.map(p=> <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <div>
            <SubcategoryPicker category={category} initialSubs={subs} onChange={setSubs} />
          </div>
        </div>
        <div className="space-y-3">
          <label>姓名
            <input value={form.name} onChange={(e)=>setForm(v=>({ ...v, name: e.target.value }))} />
          </label>
          <label>公司
            <input value={form.company} onChange={(e)=>setForm(v=>({ ...v, company: e.target.value }))} />
          </label>
          <label>職稱
            <input value={form.title} onChange={(e)=>setForm(v=>({ ...v, title: e.target.value }))} />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>電話
              <input value={form.phone} onChange={(e)=>{ const val=e.target.value; setForm(v=>({ ...v, phone: val })); checkPhoneUnique(val) }} />
              {checkingPhone && <span className="text-xs text-gray-400">檢查中…</span>}
              {phoneExists && <div className="text-xs text-red-600">此手機已建立過名片</div>}
            </label>
            <label>Email
              <input value={form.email} onChange={(e)=>setForm(v=>({ ...v, email: e.target.value }))} />
            </label>
          </div>
          <label>地址
            <input value={form.address} onChange={(e)=>setForm(v=>({ ...v, address: e.target.value }))} />
          </label>
          <label>網站
            <input value={form.website} onChange={(e)=>setForm(v=>({ ...v, website: e.target.value }))} />
          </label>
          <label>備註
            <textarea rows={3} value={form.notes} onChange={(e)=>setForm(v=>({ ...v, notes: e.target.value }))} />
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={loading || !form.name || !category}>{loading ? '儲存中…' : '儲存'}</Button>
        <Button as={Link} href="/cards" variant="ghost">取消</Button>
      </div>
    </div>
  )
}


