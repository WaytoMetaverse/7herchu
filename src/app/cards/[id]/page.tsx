import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default async function CardDetailPage({ params }: { params: { id: string } }) {
  const card = await prisma.businessCard.findUnique({ where: { id: params.id } })
  if (!card) return <div className="max-w-3xl mx-auto p-4">找不到名片</div>
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{card.name}</h1>
        <div className="flex items-center gap-2">
          <Button as={Link} href={`/cards/${card.id}/edit`} variant="outline">編輯</Button>
          <form action={`/api/cards/${card.id}`} method="POST" onSubmit={(e)=>{ if(!confirm('確定要刪除嗎？')) e.preventDefault() }}>
            <input type="hidden" name="_method" value="DELETE" />
            <Button type="submit" variant="danger">刪除</Button>
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


