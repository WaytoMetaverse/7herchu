import CardsClient from '@/components/cards/CardsClient'
import { CardCategory } from '@prisma/client'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: CardCategory; subs?: string }> }) {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const category = (sp.category || '') as CardCategory
  const subs = (sp.subs || '').split(',').filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight truncate">名片庫</h1>
        <div className="flex items-center gap-2">
          <Button as={Link} href="/cards/scan" variant="outline" size="sm" className="whitespace-nowrap">掃描名片</Button>
          <Button as={Link} href="/cards/manage" variant="primary" size="sm" className="whitespace-nowrap">名片管理</Button>
        </div>
      </div>
      <CardsClient initialQ={q} initialCategory={category || ''} initialSubs={subs} />
    </div>
  )
}


