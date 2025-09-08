"use client"
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'

const MAP: Record<string, string[]> = {
  FINANCE: [
    '銀行 / 融資公司',
    '租賃公司',
    '保險公司（火險、產險、工程險）',
    '投資基金 / REITs',
    '資產管理公司',
    '財務顧問 / 理財規劃顧問',
  ],
  DEVELOPMENT: [
    '土地開發商',
    '建設公司 / 開發商',
    '不動產仲介',
    '建案代銷',
    '不動產估價師事務所',
    '拍賣公司',
    '地政士事務所',
    '房仲業',
  ],
  DESIGN: [
    '建築師事務所',
    '室內設計',
    '景觀設計',
    '跑照代辦公司',
    '測量師事務所 / 地政士',
    '3D建模/渲染',
    '軟裝設計',
  ],
  CONSTRUCTION: [
    '營造公司（總包 / 統包）',
    '土方工程',
    '鋼筋工程',
    '模板工程',
    '混凝土 / 水泥',
    '結構補強',
    '防水工程',
    '拆除工程',
  ],
  MATERIALS: [
    '基礎建材供應商（鋼材、不銹鋼、水泥、石材、木材）',
    '綠建材供應商（節能、環保建材）',
    '瓷磚工程',
    '地板工程',
    '玻璃工程',
    '鋁門窗工程',
    '系統櫃工程',
    '廚具工程',
    '消防工程',
    '結構 / 機電工程',
    '裝修工程（住宅、商空）',
    '水電工程',
    '木工裝修',
    '油漆/藝術塗料工程',
    '窗簾 / 壁紙供應商',
    '燈具 / 照明',
    '冷凍空調工程',
    '電梯工程',
    '智能家居',
    '清潔維護',
  ],
  MANAGEMENT: [
    '物業管理公司',
    '旅宿管理公司',
    '包租代管公司',
    '不動產法律事務所',
    '稅務 / 會計師事務所',
    '不動產顧問公司',
    '仲裁 / 鑑定公司',
  ],
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
  }, [category, onChange])

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


