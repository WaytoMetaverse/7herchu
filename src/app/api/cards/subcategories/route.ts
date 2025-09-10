import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CardCategory, Role, OrgSettings, Prisma } from '@prisma/client'

export async function GET() {
  const s = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
  return NextResponse.json({
    FINANCE: s?.cardSubFinance ?? [],
    DEVELOPMENT: s?.cardSubDevelopment ?? [],
    DESIGN: s?.cardSubDesign ?? [],
    CONSTRUCTION: s?.cardSubConstruction ?? [],
    MATERIALS: s?.cardSubMaterials ?? [],
    MANAGEMENT: s?.cardSubManagement ?? [],
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
  if (!roles.includes('admin')) return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { category, name } = await req.json()
  const key = resolveKey(category as CardCategory)
  if (!key || !name || typeof name !== 'string') return NextResponse.json({ error: '參數錯誤' }, { status: 400 })

  const createData: Prisma.OrgSettingsCreateInput = {
    id: 'singleton',
    bankInfo: '',
    cardSubFinance: [],
    cardSubDevelopment: [],
    cardSubDesign: [],
    cardSubConstruction: [],
    cardSubMaterials: [],
    cardSubManagement: [],
  }
  switch (key) {
    case 'cardSubFinance': createData.cardSubFinance = [name]; break
    case 'cardSubDevelopment': createData.cardSubDevelopment = [name]; break
    case 'cardSubDesign': createData.cardSubDesign = [name]; break
    case 'cardSubConstruction': createData.cardSubConstruction = [name]; break
    case 'cardSubMaterials': createData.cardSubMaterials = [name]; break
    case 'cardSubManagement': createData.cardSubManagement = [name]; break
  }

  const updateData: Prisma.OrgSettingsUpdateInput = makePushUpdate(key, name)

  await prisma.orgSettings.upsert({
    where: { id: 'singleton' },
    create: createData,
    update: updateData,
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles) ?? []
  if (!roles.includes('admin')) return NextResponse.json({ error: '無權限' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') as CardCategory | null
  const name = searchParams.get('name')
  const key = resolveKey(category || undefined)
  if (!key || !name) return NextResponse.json({ error: '參數錯誤' }, { status: 400 })

  const inUse = await prisma.businessCard.count({ where: { category: category as CardCategory, subcategories: { has: name } } })
  if (inUse > 0) return NextResponse.json({ error: '已有名片使用，無法刪除' }, { status: 400 })

  const s = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
  const arr = (s?.[key as keyof OrgSettings] as unknown as string[] | undefined) ?? []
  const next = arr.filter((x) => x !== name)
  const updateData2: Prisma.OrgSettingsUpdateInput = makeSetUpdate(key, next)
  const createData2: Prisma.OrgSettingsCreateInput = {
    id: 'singleton',
    bankInfo: '',
    cardSubFinance: [],
    cardSubDevelopment: [],
    cardSubDesign: [],
    cardSubConstruction: [],
    cardSubMaterials: [],
    cardSubManagement: [],
  }
  switch (key) {
    case 'cardSubFinance': createData2.cardSubFinance = next; break
    case 'cardSubDevelopment': createData2.cardSubDevelopment = next; break
    case 'cardSubDesign': createData2.cardSubDesign = next; break
    case 'cardSubConstruction': createData2.cardSubConstruction = next; break
    case 'cardSubMaterials': createData2.cardSubMaterials = next; break
    case 'cardSubManagement': createData2.cardSubManagement = next; break
  }
  await prisma.orgSettings.upsert({
    where: { id: 'singleton' },
    update: updateData2,
    create: createData2,
  })
  return NextResponse.json({ ok: true })
}

function resolveKey(category?: CardCategory) {
  switch (category) {
    case 'FINANCE': return 'cardSubFinance'
    case 'DEVELOPMENT': return 'cardSubDevelopment'
    case 'DESIGN': return 'cardSubDesign'
    case 'CONSTRUCTION': return 'cardSubConstruction'
    case 'MATERIALS': return 'cardSubMaterials'
    case 'MANAGEMENT': return 'cardSubManagement'
    default: return null
  }
}

function makePushUpdate(key: string, name: string): Prisma.OrgSettingsUpdateInput {
  switch (key) {
    case 'cardSubFinance': return { cardSubFinance: { push: name } }
    case 'cardSubDevelopment': return { cardSubDevelopment: { push: name } }
    case 'cardSubDesign': return { cardSubDesign: { push: name } }
    case 'cardSubConstruction': return { cardSubConstruction: { push: name } }
    case 'cardSubMaterials': return { cardSubMaterials: { push: name } }
    case 'cardSubManagement': return { cardSubManagement: { push: name } }
    default: return {}
  }
}

function makeSetUpdate(key: string, values: string[]): Prisma.OrgSettingsUpdateInput {
  switch (key) {
    case 'cardSubFinance': return { cardSubFinance: { set: values } }
    case 'cardSubDevelopment': return { cardSubDevelopment: { set: values } }
    case 'cardSubDesign': return { cardSubDesign: { set: values } }
    case 'cardSubConstruction': return { cardSubConstruction: { set: values } }
    case 'cardSubMaterials': return { cardSubMaterials: { set: values } }
    case 'cardSubManagement': return { cardSubManagement: { set: values } }
    default: return {}
  }
}


