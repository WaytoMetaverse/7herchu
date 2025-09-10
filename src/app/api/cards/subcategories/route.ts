import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CardCategory, Role, OrgSettings, Prisma } from '@prisma/client'

const DEFAULTS: Record<CardCategory, string[]> = {
  FINANCE: [
    '銀行 / 融資公司',
    '租賃公司',
    '保險公司（火險、產險、工程險）',
    '投資基金 / REITs',
    '資產管理公司',
    '財務顧問 / 理財規劃顧問',
  ],
  DEVELOPMENT: [
    '土地開發商',
    '建設公司 / 開發商',
    '不動產仲介',
    '建案代銷',
    '不動產估價師事務所',
    '拍賣公司',
    '地政士事務所',
    '房仲業',
  ],
  DESIGN: [
    '建築師事務所',
    '室內設計',
    '景觀設計',
    '跑照代辦公司',
    '測量師事務所 / 地政士',
    '3D建模/渲染',
    '軟裝設計',
  ],
  CONSTRUCTION: [
    '營造公司（總包 / 統包）',
    '土方工程',
    '鋼筋工程',
    '模板工程',
    '混凝土 / 水泥',
    '結構補強',
    '防水工程',
    '拆除工程',
  ],
  MATERIALS: [
    '基礎建材供應商（鋼材、不銹鋼、水泥、石材、木材）',
    '綠建材供應商（節能、環保建材）',
    '瓷磚工程',
    '地板工程',
    '玻璃工程',
    '鋁門窗工程',
    '系統櫃工程',
    '廚具工程',
    '消防工程',
    '結構 / 機電工程',
    '裝修工程（住宅、商空）',
    '水電工程',
    '木工裝修',
    '油漆/藝術塗料工程',
    '窗簾 / 壁紙供應商',
    '燈具 / 照明',
    '冷凍空調工程',
    '電梯工程',
    '智能家居',
    '清潔維護',
  ],
  MANAGEMENT: [
    '物業管理公司',
    '旅宿管理公司',
    '包租代管公司',
    '不動產法律事務所',
    '稅務 / 會計師事務所',
    '不動產顧問公司',
    '仲裁 / 鑑定公司',
  ],
}

export async function GET() {
  const s = await prisma.orgSettings.findUnique({ where: { id: 'singleton' } })
  let result = {
    FINANCE: s?.cardSubFinance ?? [],
    DEVELOPMENT: s?.cardSubDevelopment ?? [],
    DESIGN: s?.cardSubDesign ?? [],
    CONSTRUCTION: s?.cardSubConstruction ?? [],
    MATERIALS: s?.cardSubMaterials ?? [],
    MANAGEMENT: s?.cardSubManagement ?? [],
  }
  const allEmpty = Object.values(result).every((arr) => (arr as string[]).length === 0)
  if (allEmpty) {
    // 首次自動灌入預設清單
    await prisma.orgSettings.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        bankInfo: '',
        cardSubFinance: DEFAULTS.FINANCE,
        cardSubDevelopment: DEFAULTS.DEVELOPMENT,
        cardSubDesign: DEFAULTS.DESIGN,
        cardSubConstruction: DEFAULTS.CONSTRUCTION,
        cardSubMaterials: DEFAULTS.MATERIALS,
        cardSubManagement: DEFAULTS.MANAGEMENT,
      },
      update: {
        cardSubFinance: { set: DEFAULTS.FINANCE },
        cardSubDevelopment: { set: DEFAULTS.DEVELOPMENT },
        cardSubDesign: { set: DEFAULTS.DESIGN },
        cardSubConstruction: { set: DEFAULTS.CONSTRUCTION },
        cardSubMaterials: { set: DEFAULTS.MATERIALS },
        cardSubManagement: { set: DEFAULTS.MANAGEMENT },
      },
    })
    result = { ...DEFAULTS }
  }
  return NextResponse.json(result)
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


