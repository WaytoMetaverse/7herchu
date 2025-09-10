"use client"
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
const CACHE: Record<string, string[]> = {}

export default function SubcategoryPicker({
  category,
  initialSubs,
  inputName = 'subs',
  onChange,
}: { category: string; initialSubs: string[]; inputName?: string; onChange?: (subs: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const [subs, setSubs] = useState<string[]>(initialSubs)

  useEffect(() => {
    let aborted = false
    async function load() {
      if (!category) { setSubs([]); if (onChange) onChange([]); return }
      if (!CACHE[category]) {
        const res = await fetch('/api/cards/subcategories')
        const data = await res.json()
        CACHE[category] = data?.[category] || []
      }
      if (aborted) return
      const list = CACHE[category] || []
      setSubs((cur) => {
        const next = cur.filter((s) => list.includes(s))
        if (onChange) onChange(next)
        return next
      })
    }
    load()
    return () => { aborted = true }
  }, [category, onChange])

  const list = CACHE[category] || []
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


