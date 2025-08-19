'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Home, Users, IdCard, User } from 'lucide-react'

const items = [
  { href: '/hall', label: '大廳', Icon: Home },
  { href: '/calendar', label: '預約', Icon: CalendarDays },
  { href: '/group', label: '小組', Icon: Users },
  { href: '/cards', label: '名片', Icon: IdCard },
  { href: '/profile', label: '我', Icon: User },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))' }}>
      <ul className="grid grid-cols-5 h-[56px] text-[11px]">
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


