"use client"

import React from 'react'

export default function ResetTestPwButton() {
	async function handleClick() {
		try {
			const res = await fetch('/api/dev/admin-reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			})
			const data = await res.json()
			if (!res.ok || !data?.ok) {
				alert(`重設失敗：${data?.error || res.status}`)
				return
			}
			alert('已將 test@gmail.com、test2@gmail.com 的密碼重設為 123')
		} catch (err) {
			console.error(err)
			alert('重設失敗，請稍後再試')
		}
	}

	return (
		<button onClick={handleClick} className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700 text-white">
			重設測試帳號密碼為123
		</button>
	)
}
