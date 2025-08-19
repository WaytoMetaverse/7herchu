'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, Building2, Wallet2, IdCard, User } from 'lucide-react'

const items = [
  { href: '/calendar', label: '講師', Icon: CalendarCheck },
  { href: '/hall', label: '活動', Icon: Building2 },
  { href: '/admin/finance', label: '財務', Icon: Wallet2 },
  { href: '/cards', label: '名片', Icon: IdCard },
  { href: '/profile', label: '個人', Icon: User },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))', height: 'var(--mobile-tabbar-h)' }}>
      <ul className="grid grid-cols-5 h-full text-[11px]">
        {items.map(({ href, label, Icon }) => {
          const active = pathname?.startsWith(href)
          return (
            <li key={href} className="flex items-stretch">
              <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-600 hover:text-gray-900">
                <Icon size={20} className={active ? 'text-gray-900' : ''} />
                <span className={active ? 'text-gray-900 font-medium' : ''}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


