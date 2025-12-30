import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFileSync } from 'fs'
import { join } from 'path'

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

    console.log('[Migration] 開始執行 Prisma migration...')

    // 檢查 migration 是否已經執行
    const migrationName = '20251229153214_add_badges_system'
    
    // 檢查 enum 是否已存在
    const enumCheck = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'BadgeType'
      ) as exists
    `
    
    if (enumCheck[0]?.exists) {
      return NextResponse.json({
        success: true,
        message: 'Migration already applied',
        skipped: true
      })
    }

    // 讀取 migration SQL 文件
    const migrationPath = join(process.cwd(), 'prisma', 'migrations', migrationName, 'migration.sql')
    let migrationSQL: string
    
    try {
      migrationSQL = readFileSync(migrationPath, 'utf-8')
    } catch (error) {
      // 如果在 serverless 環境無法讀取文件，直接執行 SQL
      migrationSQL = `
-- CreateEnum
CREATE TYPE "public"."BadgeType" AS ENUM ('GROUP_MEETING', 'CLOSED_MEETING', 'SOFT_ACTIVITY', 'BOD', 'DINNER', 'VISIT', 'JOINT', 'MEAL_SERVICE', 'CHECKIN', 'SPEAKER');

-- CreateEnum
CREATE TYPE "public"."BadgeLevel" AS ENUM ('BRONZE', 'COPPER', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'ELITE');

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" "public"."BadgeType" NOT NULL,
    "level" "public"."BadgeLevel" NOT NULL,
    "count" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "public"."UserBadge"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserBadge_badgeType_level_idx" ON "public"."UserBadge"("badgeType", "level");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeType_level_key" ON "public"."UserBadge"("userId", "badgeType", "level");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'UserBadge_userId_fkey'
    ) THEN
        ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
      `.trim()
    }

    // 分割 SQL 語句並執行
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results = []
    for (const statement of statements) {
      try {
        // 跳過註釋和空語句
        if (statement.startsWith('--') || !statement.trim()) continue
        
        await prisma.$executeRawUnsafe(statement)
        results.push({ statement: statement.substring(0, 50) + '...', success: true })
      } catch (error) {
        // 如果是「已存在」的錯誤，可以忽略
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          results.push({ statement: statement.substring(0, 50) + '...', success: true, skipped: true })
        } else {
          throw error
        }
      }
    }

    console.log('[Migration] Migration 執行完成')

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      results,
      executed: results.length
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

