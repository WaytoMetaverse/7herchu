import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { revalidatePath } from 'next/cache'

export default async function CardsManagePage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return <div className="max-w-4xl mx-auto p-4">請先登入</div>
  const sp = await searchParams
  const q = (sp.q || '').trim()
  const page = Math.max(parseInt(sp.page || '1', 10) || 1, 1)
  const pageSize = 20
  const where: Prisma.BusinessCardWhereInput = { deletedAt: null }
  if (q) where.OR = [{ name: { contains: q } }, { company: { contains: q } }, { phone: { contains: q } }]
  const total = await prisma.businessCard.count({ where })
  const cards = await prisma.businessCard.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize })
  const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
  const isAdmin = roles.includes('admin')

  async function remove(formData: FormData) {
    'use server'
    const session = await getServerSession(authOptions)
    const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
    const isAdmin = roles.includes('admin')
    if (!isAdmin) return
    const id = String(formData.get('id'))
    if (!id) return
    await prisma.businessCard.update({ where: { id }, data: { deletedAt: new Date() } })
    revalidatePath('/cards/manage')
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">名片管理</h1>
        <div className="flex items-center gap-2">
          <Button as={Link} href="/cards" variant="ghost">返回名片庫</Button>
          {isAdmin && (
            <Button as={Link} href="/admin/cards/subcategories" variant="outline">子分類管理</Button>
          )}
        </div>
      </div>
      <form className="mb-3">
        <input name="q" defaultValue={q} placeholder="搜尋姓名/公司/手機" className="w-full px-3 py-2 border rounded" />
      </form>
      <div className="grid gap-3">
        {cards.map(c => (
          <div key={c.id} className="p-3 border rounded flex items-center justify-between">
            <div>
              <div className="font-medium">{c.name} {c.company ? `· ${c.company}` : ''}</div>
              <div className="text-sm text-gray-600">{c.phone || '-'} {c.email ? `· ${c.email}` : ''}</div>
            </div>
            {isAdmin ? (
              <form action={remove}>
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" variant="outline" size="sm" className="text-red-600">刪除</Button>
              </form>
            ) : (
              <div className="w-[64px]" />
            )}
          </div>
        ))}
        {cards.length === 0 && (
          <div className="text-gray-500">無資料</div>
        )}
      </div>
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-600">共 {total} 筆 · 第 {page} / {Math.max(1, Math.ceil(total / pageSize))} 頁</div>
        <div className="flex items-center gap-2">
          <Button as={Link} href={`/cards/manage?${new URLSearchParams({ q, page: String(Math.max(1, page - 1)) }).toString()}`} variant="outline" size="sm" aria-disabled={page <= 1}>上一頁</Button>
          <Button as={Link} href={`/cards/manage?${new URLSearchParams({ q, page: String(page + 1) }).toString()}`} variant="outline" size="sm" aria-disabled={page >= Math.ceil(total / pageSize)}>下一頁</Button>
        </div>
      </div>
    </div>
  )
}


