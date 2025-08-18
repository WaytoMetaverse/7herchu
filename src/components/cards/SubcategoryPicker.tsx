"use client"
import { useEffect, useMemo, useState } from 'react'
import Button from '@/components/ui/Button'

const MAP: Record<string, string[]> = {
  FINANCE: ['銀行', '租賃公司', '保險公司', '投資基金/REITs', '資產管理公司'],
  DEVELOPMENT: ['土地開發商', '建設公司', '不動產仲介公司', '代銷公司', '不動產估價師事務所', '拍賣公司'],
  DESIGN: ['建築師事務所', '室內設計公司', '景觀設計公司', '都市規劃顧問公司', '跑照代辦公司', '測量師/地政士事務所', '結構機電顧問公司'],
  CONSTRUCTION: ['營造公司（總包/統包）', '土方工程公司', '鋼筋工程公司', '模板工程公司', '混凝土供應公司', '結構補強公司', '防水工程公司', '拆除工程公司'],
  MATERIALS: ['基礎建材供應商', '裝修建材供應商', '綠建材供應商', '系統家具公司', '裝修工程公司', '水電工程公司', '木工裝修公司', '油漆工程公司', '專業安裝公司'],
  MANAGEMENT: ['物業管理公司', '旅宿管理公司', '包租代管公司', '不動產法律事務所', '稅務/會計師事務所', '不動產顧問公司', '仲裁/鑑定公司'],
}

export default function SubcategoryPicker({
  category,
  initialSubs,
  inputName = 'subs',
  onChange,
}: { category: string; initialSubs: string[]; inputName?: string; onChange?: (subs: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [subs, setSubs] = useState<string[]>(initialSubs)

  useEffect(() => {
    // 切換主類時，若原子類不屬於該主類，移除
    const list = MAP[category] || []
    setSubs((cur) => {
      const next = cur.filter((s) => list.includes(s))
      if (onChange) onChange(next)
      return next
    })
  }, [category])

  const list = MAP[category] || []
  const selectedCount = subs.length

  function toggle(s: string) {
    setSubs((cur) => {
      const next = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
      if (onChange) onChange(next)
      return next
    })
  }

  return (
    <div className="relative">
      <input type="hidden" name={inputName} value={subs.join(',')} />
      <Button type="button" variant="outline" onClick={() => setOpen((v) => !v)}>
        子類（已選{selectedCount}）
      </Button>
      {open && (
        <div className="absolute z-10 mt-2 w-72 max-h-80 overflow-auto rounded-lg border bg-white p-3 shadow">
          {list.length === 0 ? (
            <div className="text-xs text-gray-500">請先選擇主類</div>
          ) : (
            <div className="space-y-2">
              {list.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={subs.includes(s)}
                    onChange={() => toggle(s)}
                  />
                  {s}
                </label>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => { setSubs([]); if (onChange) onChange([]) }}>清除</Button>
            <Button type="button" onClick={() => setOpen(false)}>完成</Button>
          </div>
        </div>
      )}
    </div>
  )
}


