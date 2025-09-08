"use client"
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import SubcategoryPicker from '@/components/cards/SubcategoryPicker'
import { Phone, Tag } from 'lucide-react'

type Card = {
  id: string
  name: string
  title?: string | null
  company?: string | null
  phone?: string | null
  subcategories?: string[] | null
}

const PRESET = [
  { label: '金融租賃', value: 'FINANCE' },
  { label: '開發買賣', value: 'DEVELOPMENT' },
  { label: '規畫設計', value: 'DESIGN' },
  { label: '整地建築', value: 'CONSTRUCTION' },
  { label: '建材裝修', value: 'MATERIALS' },
  { label: '管理專業', value: 'MANAGEMENT' },
]

export default function CardsClient({ initialQ, initialCategory, initialSubs }: { initialQ: string; initialCategory: string; initialSubs: string[] }) {
  const [q, setQ] = useState(initialQ)
  const [category, setCategory] = useState(initialCategory)
  const [subs, setSubs] = useState<string[]>(initialSubs)
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  // 共用名片庫：不區分擁有者

  useEffect(() => {
    const controller = new AbortController()
    async function run() {
      setLoading(true)
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      if (subs.length) params.set('subs', subs.join(','))
      const res = await fetch(`/api/cards?${params.toString()}`, { signal: controller.signal, cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (data?.data) setCards(data.data as Card[])
      setLoading(false)
      // 同步 URL（可分享）
      const url = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState(null, '', url)
    }
    // 簡單防抖
    const h = setTimeout(run, 200)
    return () => { clearTimeout(h); controller.abort() }
  }, [q, category, subs])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="搜尋姓名 / 公司 / 職稱" className="border rounded px-3 py-2" />
          <select value={category} onChange={(e)=>setCategory(e.target.value)} className="border rounded px-2 py-2">
            <option value="">全部分類</option>
            {PRESET.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <SubcategoryPicker category={category || ''} initialSubs={subs} inputName="subs" onChange={setSubs} />
          {/* 共用名片庫，無需擁有者過濾 */}
        </div>
        {/* 右側操作移除「掃描名片」按鈕，僅保留標題列上的快速入口 */}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">載入中…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map(c => (
            <Link key={c.id} href={`/cards/${c.id}`} className="rounded-xl border border-gray-200 bg-white p-3 hover:bg-gray-50">
              <div className="font-medium">{c.name}</div>
              <div className="text-sm text-gray-700">{[c.company, c.title].filter(Boolean).join(' · ')}</div>
              {c.phone ? (
                <div className="text-xs text-gray-600 flex items-center gap-2 mt-1">
                  <Phone className="w-3 h-3" />
                  <a href={`tel:${c.phone}`} className="underline">{c.phone}</a>
                </div>
              ) : null}
              <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                <Tag className="w-3 h-3" />
                <span>{(c.subcategories || []).join('、') || '-'}</span>
              </div>
            </Link>
          ))}
          {cards.length === 0 && <div className="text-sm text-gray-500">沒有符合條件的名片</div>}
        </div>
      )}
    </div>
  )
}


