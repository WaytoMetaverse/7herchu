import { NextResponse } from 'next/server'
import { del, list } from '@vercel/blob'

// 每日排程：刪除 90 天前的上傳檔案
export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'no blob token' })
  }
  // 取得「當月月初往前推 3 個整月」的時間點
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const cutoffDate = new Date(firstOfThisMonth)
  cutoffDate.setMonth(cutoffDate.getMonth() - 3)
  const cutoff = cutoffDate.getTime()
  const prefix = 'uploads/'
  let removed = 0
  for await (const item of list({ token: process.env.BLOB_READ_WRITE_TOKEN, prefix })) {
    // item.uploadedAt 為 ISO 字串
    const uploadedAt = new Date(item.uploadedAt).getTime()
    if (uploadedAt && uploadedAt < cutoff) {
      await del(item.url, { token: process.env.BLOB_READ_WRITE_TOKEN })
      removed += 1
    }
  }
  return NextResponse.json({ ok: true, removed })
}


