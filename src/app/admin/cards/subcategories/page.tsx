import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { CardCategory, OrgSettings } from '@prisma/client'
import { revalidatePath } from 'next/cache'

const GROUPS: { key: keyof typeof LABELS; cat: CardCategory }[] = [
  { key: 'FINANCE', cat: 'FINANCE' },
  { key: 'DEVELOPMENT', cat: 'DEVELOPMENT' },
  { key: 'DESIGN', cat: 'DESIGN' },
  { key: 'CONSTRUCTION', cat: 'CONSTRUCTION' },
  { key: 'MATERIALS', cat: 'MATERIALS' },
  { key: 'MANAGEMENT', cat: 'MANAGEMENT' },
]

const LABELS = {
  FINANCE: '金融租賃',
  DEVELOPMENT: '開發買賣',
  DESIGN: '規畫設計',
  CONSTRUCTION: '整地建築',
  MATERIALS: '建材裝修',
  MANAGEMENT: '管理專業',
}

function getListByCategory(s: OrgSettings | null, cat: CardCategory): string[] {
  switch (cat) {
    case 'FINANCE': return s?.cardSubFinance ?? []
    case 'DEVELOPMENT': return s?.cardSubDevelopment ?? []
    case 'DESIGN': return s?.cardSubDesign ?? []
    case 'CONSTRUCTION': return s?.cardSubConstruction ?? []
    case 'MATERIALS': return s?.cardSubMaterials ?? []
    case 'MANAGEMENT': return s?.cardSubManagement ?? []
    default: return []
  }
}

export default async function CardSubcategoriesAdminPage() {
  const session = await getServerSession(authOptions)
  const roles = ((session?.user as { roles?: string[] } | undefined)?.roles) ?? []
  const isAdmin = roles.includes('admin')
  if (!isAdmin) return <div className="max-w-5xl mx-auto p-4">無權限</div>

  const s = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })

  async function add(formData: FormData) {
    'use server'
    const category = String(formData.get('category') || '') as CardCategory
    const name = String(formData.get('name') || '').trim()
    if (!category || !name) return
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cards/subcategories`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category, name })
    })
    revalidatePath('/admin/cards/subcategories')
  }

  async function remove(formData: FormData) {
    'use server'
    const category = String(formData.get('category') || '') as CardCategory
    const name = String(formData.get('name') || '')
    if (!category || !name) return
    const res = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cards/subcategories?` + new URLSearchParams({ category, name }), { method: 'DELETE' })
    if (!res.ok) return
    revalidatePath('/admin/cards/subcategories')
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">子分類管理</h1>
        <Button as={Link} href="/cards/manage" variant="ghost">返回名片管理</Button>
      </div>

      {GROUPS.map(({ key, cat }) => {
        const list = getListByCategory(s, cat)
        return (
          <div key={key} className="border rounded p-3 space-y-2">
            <div className="font-medium">{LABELS[key]}</div>
            <div className="flex flex-wrap gap-2">
              {list.map((name) => (
                <form key={name} action={remove} className="flex items-center gap-2 border rounded px-2 py-1">
                  <input type="hidden" name="category" value={cat} />
                  <input type="hidden" name="name" value={name} />
                  <span className="text-sm">{name}</span>
                  <Button type="submit" size="sm" variant="outline" className="text-red-600">刪除</Button>
                </form>
              ))}
              {list.length === 0 && (
                <div className="text-sm text-gray-500">尚無子分類</div>
              )}
            </div>
            <form action={add} className="flex items-center gap-2">
              <input type="hidden" name="category" value={cat} />
              <input name="name" placeholder="新增子分類名稱" className="border rounded px-2 py-1" />
              <Button type="submit" size="sm">新增</Button>
            </form>
          </div>
        )
      })}
    </div>
  )
}


