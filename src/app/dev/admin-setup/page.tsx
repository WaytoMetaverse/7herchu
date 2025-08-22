'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Button from '@/components/ui/Button'

export default function AdminSetupPage() {
	const { data: session } = useSession()
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState<string | null>(null)

	const handleSetAdmin = async () => {
		if (!session?.user?.email) {
			setResult('請先登入')
			return
		}

		setLoading(true)
		setResult(null)
		
		try {
			const response = await fetch('/api/dev/set-admin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: session.user.email })
			})
			
			const data = await response.json()
			
			if (response.ok) {
				setResult(`✅ 成功！${session.user.email} 已設為管理員。請重新整理頁面。`)
			} else {
				setResult(`❌ 失敗：${data.error || '未知錯誤'}`)
			}
		} catch (error) {
			console.error('Set admin error:', error)
			setResult('❌ 網路錯誤，請稍後再試')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50">
			<div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow">
				<div className="text-center space-y-2">
					<h1 className="text-2xl font-semibold">管理員設定</h1>
					<p className="text-sm text-gray-600">將當前登入帳號設為系統管理員</p>
				</div>

				{session?.user ? (
					<div className="space-y-4">
						<div className="bg-gray-50 p-3 rounded text-sm">
							<div className="font-medium">當前登入帳號：</div>
							<div className="text-gray-600">{session.user.email}</div>
						</div>

						<Button 
							onClick={handleSetAdmin}
							disabled={loading}
							className="w-full"
							variant="primary"
						>
							{loading ? '設定中...' : '設為管理員'}
						</Button>

						{result && (
							<div className={`text-sm p-3 rounded ${
								result.includes('✅') 
									? 'bg-green-50 text-green-700' 
									: 'bg-red-50 text-red-700'
							}`}>
								{result}
							</div>
						)}
					</div>
				) : (
					<div className="text-center space-y-4">
						<p className="text-gray-600">請先登入系統</p>
						<Button 
							onClick={() => window.location.href = '/auth/signin'}
							variant="outline"
							className="w-full"
						>
							前往登入
						</Button>
					</div>
				)}
			</div>
		</div>
	)
}
