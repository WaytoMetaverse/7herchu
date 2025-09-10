import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export default async function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await prisma.businessCard.findUnique({ where: { id } })
  if (!card) return <div className="max-w-3xl mx-auto p-4">找不到名片</div>
  if (card.deletedAt) return <div className="max-w-3xl mx-auto p-4">名片已刪除</div>
  async function deleteCard() {
    'use server'
    await prisma.businessCard.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath('/cards')
    redirect('/cards')
  }
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold truncate">{card.name}</h1>
        <div className="flex items-center gap-2">
          <Button as={Link} href={`/cards/${card.id}/edit`} variant="outline" className="whitespace-nowrap">編輯</Button>
          <form action={deleteCard}>
            <Button type="submit" variant="danger" className="whitespace-nowrap">刪除</Button>
          </form>
        </div>
      </div>
      {card.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.imageUrl} alt={card.name} className="w-full max-h-72 object-contain rounded border" />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>公司：{card.company || '-'}</div>
        <div>職稱：{card.title || '-'}</div>
        <div>電話：{card.phone || '-'}</div>
        <div>Email：{card.email || '-'}</div>
        <div>網站：{card.website || '-'}</div>
        <div>地址：{card.address || '-'}</div>
      </div>
      <div className="text-sm">主類：{card.category}</div>
      <div className="text-sm">子類：{(card.subcategories || []).join('、') || '-'}</div>
      <div className="text-sm">備註：{card.notes || '-'}</div>
      <div><Button as={Link} href="/cards" variant="ghost">返回名片庫</Button></div>
    </div>
  )
}


