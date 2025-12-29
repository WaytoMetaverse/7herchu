import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

/**
 * 執行 Prisma Migration
 * 安全檢查：需要提供正確的 secret token
 * 
 * 使用方式：
 * GET /api/migrate?token=YOUR_SECRET_TOKEN
 * 
 * 建議在 Vercel Dashboard 的 Environment Variables 中設定 MIGRATE_SECRET_TOKEN
 */
export async function GET(req: NextRequest) {
  try {
    // 檢查 secret token
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    const expectedToken = process.env.MIGRATE_SECRET_TOKEN

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'Migration secret token not configured' },
        { status: 500 }
      )
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // 執行 migration
    console.log('[Migration] 開始執行 Prisma migration...')
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy')

    console.log('[Migration] Migration 輸出:', stdout)
    if (stderr) {
      console.warn('[Migration] Migration 警告:', stderr)
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      output: stdout,
      warnings: stderr || null
    })
  } catch (error) {
    console.error('[Migration] Migration 失敗:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    )
  }
}

