import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import SubcategoryPicker from '@/components/cards/SubcategoryPicker'

export default async function CardEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const card = await prisma.businessCard.findUnique({ where: { id } })
  if (!card) return <div className="max-w-3xl mx-auto p-4">找不到名片</div>

  async function update(formData: FormData) {
    'use server'
    const cardId = id
    const payload = {
      name: String(formData.get('name') || ''),
      company: String(formData.get('company') || ''),
      title: String(formData.get('title') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      address: String(formData.get('address') || ''),
      website: String(formData.get('website') || ''),
      notes: String(formData.get('notes') || ''),
      category: String(formData.get('category') || ''),
      subcategories: String(formData.get('subs') || '').split(',').filter(Boolean),
    }
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cards/${cardId}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    })
    // no return value needed
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold truncate">編輯名片</h1>
        <Button as={Link} href={`/cards/${card.id}`} variant="ghost" className="whitespace-nowrap">取消</Button>
      </div>
      <form action={update} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">姓名
          <input name="name" defaultValue={card.name} className="mt-1" />
        </label>
        <label className="text-sm">公司
          <input name="company" defaultValue={card.company || ''} className="mt-1" />
        </label>
        <label className="text-sm">職稱
          <input name="title" defaultValue={card.title || ''} className="mt-1" />
        </label>
        <label className="text-sm">電話
          <input name="phone" defaultValue={card.phone || ''} className="mt-1" />
        </label>
        <label className="text-sm">Email
          <input name="email" defaultValue={card.email || ''} className="mt-1" />
        </label>
        <label className="text-sm">主類
          <select name="category" defaultValue={card.category} className="mt-1">
            <option value="FINANCE">金融租賃</option>
            <option value="DEVELOPMENT">開發買賣</option>
            <option value="DESIGN">規畫設計</option>
            <option value="CONSTRUCTION">整地建築</option>
            <option value="MATERIALS">建材裝修</option>
            <option value="MANAGEMENT">管理專業</option>
          </select>
        </label>
        <div className="text-sm">
          <div className="mb-1">子類</div>
          <SubcategoryPicker category={card.category} initialSubs={card.subcategories || []} inputName="subs" />
        </div>
        <label className="md:col-span-2">地址
          <input name="address" defaultValue={card.address || ''} />
        </label>
        <label className="md:col-span-2">網站
          <input name="website" defaultValue={card.website || ''} />
        </label>
        <label className="md:col-span-2">備註
          <textarea name="notes" defaultValue={card.notes || ''} rows={3} />
        </label>
        <div className="md:col-span-2"><Button type="submit">儲存</Button></div>
      </form>
    </div>
  )
}


