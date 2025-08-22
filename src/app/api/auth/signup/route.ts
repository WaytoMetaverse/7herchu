import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body?.email || '').trim().toLowerCase()
  const password = String(body?.password || '')
  const inviteToken = String(body?.inviteToken || '')
  
  if (!email || !password) return NextResponse.json({ error: '缺少信箱或密碼' }, { status: 400 })
  
  // 檢查邀請 token
  if (!inviteToken) return NextResponse.json({ error: '需要有效的邀請連結才能註冊' }, { status: 400 })
  
  const tokenRecord = await prisma.inviteToken.findUnique({
    where: { token: inviteToken },
    select: { id: true, isActive: true }
  })
  
  if (!tokenRecord?.isActive) {
    return NextResponse.json({ error: '邀請連結無效或已過期' }, { status: 400 })
  }
  
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email 格式不正確' }, { status: 400 })
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: '此信箱已註冊' }, { status: 400 })
  
  const hash = bcrypt.hashSync(password, 10)
  const user = await prisma.user.create({ data: { email, passwordHash: hash, roles: [] } })
  
  // 更新邀請 token 使用次數
  await prisma.inviteToken.update({
    where: { token: inviteToken },
    data: { usedCount: { increment: 1 } }
  })
  
  return NextResponse.json({ ok: true, id: user.id })
}


