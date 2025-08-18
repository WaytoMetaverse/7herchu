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
  const [category, setCategory] = useState('')
  const [subs, setSubs] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '', company: '', title: '', email: '', phone: '', address: '', website: '', notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setImageFile(f)
    if (f) {
      const url = URL.createObjectURL(f)
      setImagePreview(url)
    } else {
      setImagePreview(null)
    }
  }

  async function save() {
    setLoading(true)
    setErr(null)
    try {
      let imageUrl: string | undefined
      if (imageFile) {
        const fd = new FormData()
        fd.append('file', imageFile)
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
    } catch (e: any) {
      setErr(e.message || '發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">新增名片</h1>
        <Button as={Link} href="/cards" variant="ghost">返回名片庫</Button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm block">名片圖片
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="mt-1" />
            </label>
            {imagePreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="預覽" className="mt-2 w-full h-48 object-contain rounded border" />
            )}
          </div>
          <label className="text-sm block">主類
            <select className="border rounded w-full px-2 py-2 mt-1" value={category} onChange={(e)=>setCategory(e.target.value)}>
              <option value="">請選擇</option>
              {PRESET.map(p=> <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>
          <div>
            <SubcategoryPicker category={category} initialSubs={subs} onChange={setSubs} />
          </div>
        </div>
        <div className="space-y-3">
          <label className="text-sm block">姓名
            <input className="mt-1 w-full" value={form.name} onChange={(e)=>setForm(v=>({ ...v, name: e.target.value }))} />
          </label>
          <label className="text-sm block">公司
            <input className="mt-1 w-full" value={form.company} onChange={(e)=>setForm(v=>({ ...v, company: e.target.value }))} />
          </label>
          <label className="text-sm block">職稱
            <input className="mt-1 w-full" value={form.title} onChange={(e)=>setForm(v=>({ ...v, title: e.target.value }))} />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm block">電話
              <input className="mt-1 w-full" value={form.phone} onChange={(e)=>setForm(v=>({ ...v, phone: e.target.value }))} />
            </label>
            <label className="text-sm block">Email
              <input className="mt-1 w-full" value={form.email} onChange={(e)=>setForm(v=>({ ...v, email: e.target.value }))} />
            </label>
          </div>
          <label className="text-sm block">地址
            <input className="mt-1 w-full" value={form.address} onChange={(e)=>setForm(v=>({ ...v, address: e.target.value }))} />
          </label>
          <label className="text-sm block">網站
            <input className="mt-1 w-full" value={form.website} onChange={(e)=>setForm(v=>({ ...v, website: e.target.value }))} />
          </label>
          <label className="text-sm block">備註
            <textarea className="mt-1 w-full" rows={3} value={form.notes} onChange={(e)=>setForm(v=>({ ...v, notes: e.target.value }))} />
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


