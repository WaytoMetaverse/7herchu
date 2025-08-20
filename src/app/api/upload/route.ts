import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'

// 單檔上傳端點：避免一次塞入多檔導致 413
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'invalid form' }, { status: 400 })
  const file = form.get('file') as File | null
  if (!file || typeof file.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'no file' }, { status: 400 })
  }
  const allowed = new Set([
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'
  ])
  if (!allowed.has(file.type)) {
    return NextResponse.json({ error: 'unsupported file type' }, { status: 415 })
  }
  const buf = Buffer.from(await file.arrayBuffer())
  const ext = (file.name.split('.').pop() || 'dat').toLowerCase()
  const filename = `upload_${Date.now()}_${Math.random().toString(36).slice(2,8)}.${ext}`
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const res = await put(`uploads/${filename}`, buf, {
      access: 'public',
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type || 'application/octet-stream',
    })
    return NextResponse.json({ ok: true, url: res.url })
  } else {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })
    await fs.writeFile(path.join(uploadDir, filename), buf)
    const url = `/uploads/${filename}`
    return NextResponse.json({ ok: true, url })
  }
}


