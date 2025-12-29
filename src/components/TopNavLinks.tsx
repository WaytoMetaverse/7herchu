'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/calendar', label: '講師預約' },
  { href: '/hall', label: '活動大廳' },
  { href: '/group', label: '小組管理' },
  { href: '/admin/speakers-guests', label: '來賓庫' },
]

export default function TopNavLinks() {
  const pathname = usePathname() || ''
  return (
    <ul className="ml-10 flex items-stretch rounded-lg border border-[color-mix(in_oklab,_var(--brand-600)_20%,_white)] overflow-hidden bg-white/70 backdrop-blur">
      {items.map(({ href, label }, idx) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <li key={href} className={idx === 0 ? '' : 'border-l border-[color-mix(in_oklab,_var(--brand-600)_20%,_white)]'}>
            <Link
              href={href}
              className={
                'px-4 h-10 flex items-center transition-colors focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,_var(--brand-600)_45%,_white)] ' +
                (active
                  ? 'relative bg-[color-mix(in_oklab,_var(--brand-600)_10%,_white)] text-[var(--brand-700)] font-semibold after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[var(--brand-600)]'
                  : 'hover:bg-gray-50')
              }
            >
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
