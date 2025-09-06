'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CalendarCheck, Building2, Users, IdCard, User } from 'lucide-react'

const items = [
  { href: '/calendar', label: '講師', Icon: CalendarCheck },
  { href: '/hall', label: '活動', Icon: Building2 },
  { href: '/group', label: '小組', Icon: Users },
  { href: '/cards', label: '名片', Icon: IdCard },
  { href: '/profile', label: '個人', Icon: User },
]

export default function MobileTabBar() {
  const pathname = usePathname()
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/auth/session', { headers: { 'cache-control': 'no-store' } })
      .then(res => res.json())
      .then(data => { if (mounted) setHasSession(!!data?.user) })
      .catch(() => { if (mounted) setHasSession(false) })
    return () => { mounted = false }
  }, [])

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom))', height: 'var(--mobile-tabbar-h)' }}>
      <ul className="grid grid-cols-5 h-full text-xs">
        {items.map(({ href, label, Icon }) => {
          const finalHref = label === '個人' ? (hasSession ? '/profile' : '/auth/signin?callbackUrl=%2Fprofile') : href
          const active = pathname?.startsWith(href)
          return (
            <li key={href} className="flex items-stretch">
              <Link 
                prefetch={false} 
                href={finalHref} 
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active 
                    ? 'text-black' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={20} />
                <span className={active ? 'font-semibold' : 'font-normal'}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


