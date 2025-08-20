import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 清除 session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete('next-auth.session-token')
    response.cookies.delete('__Secure-next-auth.session-token')
    response.cookies.delete('next-auth.csrf-token')
    response.cookies.delete('__Host-next-auth.csrf-token')
    
    return response
  } catch (error) {
    console.error('登出錯誤:', error)
    return NextResponse.json({ success: false, error: '登出失敗' }, { status: 500 })
  }
}
