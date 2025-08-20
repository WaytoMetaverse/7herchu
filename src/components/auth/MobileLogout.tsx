'use client'

export default function MobileLogout({ show }: { show: boolean }) {
	if (!show) return null
	async function doLogout() {
		try {
			const res = await fetch('/api/auth/signout', { method: 'POST' })
			if (res.ok) window.location.href = '/'
		} catch (e) {
			console.error('登出失敗:', e)
		}
	}
	return (
		<button onClick={doLogout} className="ml-auto text-sm text-gray-600 hover:text-gray-900 px-2 py-1 rounded">
			登出
		</button>
	)
}
