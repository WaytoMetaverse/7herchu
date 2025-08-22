import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const targetEmail = 'ai.lexihsu@gmail.com'

    // 查找或創建用戶
    let user = await prisma.user.findUnique({
      where: { email: targetEmail }
    })

    if (!user) {
      // 創建新用戶
      user = await prisma.user.create({
        data: {
          email: targetEmail,
          name: 'Admin User',
          roles: ['admin', 'event_manager', 'finance_manager', 'menu_manager', 'checkin_manager']
        }
      })
    } else {
      // 更新現有用戶的權限
      user = await prisma.user.update({
        where: { email: targetEmail },
        data: {
          roles: ['admin', 'event_manager', 'finance_manager', 'menu_manager', 'checkin_manager']
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `✅ 成功建立管理員帳號：${targetEmail}`,
      roles: user.roles
    })

  } catch (error) {
    console.error('Create admin error:', error)
    return NextResponse.json({
      success: false,
      error: '建立管理員帳號失敗'
    }, { status: 500 })
  }
}
