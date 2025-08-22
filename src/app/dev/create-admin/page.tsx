'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

export default function CreateAdminPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateAdmin = async () => {
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const response = await fetch('/api/dev/create-admin', {
        method: 'GET'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setResult(data.message)
      } else {
        setError(data.error || '建立失敗')
      }
    } catch (err) {
      console.error('Create admin error:', err)
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">建立管理員帳號</h1>
          <p className="text-sm text-gray-600">
            為 <span className="font-medium">ai.lexihsu@gmail.com</span> 建立管理員權限
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={handleCreateAdmin}
            disabled={loading}
            className="w-full"
            variant="primary"
          >
            {loading ? '建立中...' : '建立管理員帳號'}
          </Button>

          {result && (
            <div className="p-3 rounded bg-green-50 text-green-700 text-sm">
              {result}
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">建立成功後：</p>
              <ol className="text-xs text-gray-500 space-y-1">
                <li>1. 重新登入系統</li>
                <li>2. 訪問小組管理頁面</li>
                <li>3. 應該能看到所有管理功能</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
