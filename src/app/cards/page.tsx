import CardsClient from '@/components/cards/CardsClient'
import { CardCategory } from '@prisma/client'

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: CardCategory; subs?: string }> }) {
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const category = (sp.category || '') as CardCategory
  const subs = (sp.subs || '').split(',').filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight truncate">名片庫</h1>
      <CardsClient initialQ={q} initialCategory={category || ''} initialSubs={subs} />
    </div>
  )
}


