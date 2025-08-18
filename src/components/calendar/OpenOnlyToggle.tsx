"use client"
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function OpenOnlyToggle() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const openOnly = sp.get('open') === '1'

  function toggle() {
    const params = new URLSearchParams(sp.toString())
    if (openOnly) params.delete('open')
    else params.set('open', '1')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <label className="flex items-center gap-1 text-sm text-gray-700">
      <input type="checkbox" checked={openOnly} onChange={toggle} />
      只看可預約
    </label>
  )
}


