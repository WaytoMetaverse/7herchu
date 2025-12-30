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

    // 直接執行 SQL 語句（分別執行每個主要操作）
    const results = []
    
    // 1. 建立 BadgeType enum
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "public"."BadgeType" AS ENUM ('GROUP_MEETING', 'CLOSED_MEETING', 'SOFT_ACTIVITY', 'BOD', 'DINNER', 'VISIT', 'JOINT', 'MEAL_SERVICE', 'CHECKIN', 'SPEAKER')
      `)
      results.push({ statement: 'CREATE TYPE BadgeType', success: true })
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        results.push({ statement: 'CREATE TYPE BadgeType', success: true, skipped: true })
      } else {
        throw error
      }
    }
    
    // 2. 建立 BadgeLevel enum
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "public"."BadgeLevel" AS ENUM ('BRONZE', 'COPPER', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'ELITE')
      `)
      results.push({ statement: 'CREATE TYPE BadgeLevel', success: true })
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        results.push({ statement: 'CREATE TYPE BadgeLevel', success: true, skipped: true })
      } else {
        throw error
      }
    }
    
    // 3. 建立 UserBadge 表
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "public"."UserBadge" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "badgeType" "public"."BadgeType" NOT NULL,
          "level" "public"."BadgeLevel" NOT NULL,
          "count" INTEGER NOT NULL,
          "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
        )
      `)
      results.push({ statement: 'CREATE TABLE UserBadge', success: true })
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        results.push({ statement: 'CREATE TABLE UserBadge', success: true, skipped: true })
      } else {
        throw error
      }
    }
    
    // 4. 建立索引
    const indexes = [
      { name: 'UserBadge_userId_idx', sql: 'CREATE INDEX IF NOT EXISTS "UserBadge_userId_idx" ON "public"."UserBadge"("userId")' },
      { name: 'UserBadge_badgeType_level_idx', sql: 'CREATE INDEX IF NOT EXISTS "UserBadge_badgeType_level_idx" ON "public"."UserBadge"("badgeType", "level")' },
      { name: 'UserBadge_userId_badgeType_level_key', sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "UserBadge_userId_badgeType_level_key" ON "public"."UserBadge"("userId", "badgeType", "level")' }
    ]
    
    for (const idx of indexes) {
      try {
        await prisma.$executeRawUnsafe(idx.sql)
        results.push({ statement: `CREATE INDEX ${idx.name}`, success: true })
      } catch (error: any) {
        if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
          results.push({ statement: `CREATE INDEX ${idx.name}`, success: true, skipped: true })
        } else {
          throw error
        }
      }
    }
    
    // 5. 建立外鍵
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'UserBadge_userId_fkey'
          ) THEN
            ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
        END $$;
      `)
      results.push({ statement: 'ADD FOREIGN KEY UserBadge_userId_fkey', success: true })
    } catch (error: any) {
      if (error?.message?.includes('already exists') || error?.message?.includes('duplicate')) {
        results.push({ statement: 'ADD FOREIGN KEY UserBadge_userId_fkey', success: true, skipped: true })
      } else {
        throw error
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

