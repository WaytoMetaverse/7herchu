'use client'

import React from 'react'

type ProtectedActionProps = {
	label: string
	tooltip: string
	contactHref?: string
	className?: string
	children?: React.ReactNode
}

function showToast(message: string) {
	const containerId = 'app-toast-container'
	let container = document.getElementById(containerId)
	if (!container) {
		container = document.createElement('div')
		container.id = containerId
		container.style.position = 'fixed'
		container.style.right = '16px'
		container.style.bottom = '16px'
		container.style.display = 'flex'
		container.style.flexDirection = 'column'
		container.style.gap = '8px'
		container.style.zIndex = '9999'
		document.body.appendChild(container)
	}
	const toast = document.createElement('div')
	toast.textContent = message
	toast.style.background = 'rgba(17,24,39,0.9)'
	toast.style.color = 'white'
	toast.style.padding = '8px 12px'
	toast.style.borderRadius = '8px'
	toast.style.fontSize = '12px'
	toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'
	container.appendChild(toast)
	setTimeout(() => {
		toast.style.transition = 'opacity 200ms'
		toast.style.opacity = '0'
		setTimeout(() => toast.remove(), 200)
	}, 2000)
}

export default function ProtectedAction({ label, tooltip, contactHref, className, children }: ProtectedActionProps) {
	const onClick = () => {
		const link = contactHref ? ` ｜聯絡管理員：${contactHref}` : ''
		showToast(`${tooltip}${link}`)
	}

	return (
		<button
			type="button"
			aria-disabled="true"
			title={tooltip}
			onClick={onClick}
			className={[
				'inline-flex items-center justify-center p-2 text-gray-400',
				'opacity-60 cursor-not-allowed select-none whitespace-nowrap',
				className || ''
			].join(' ')}
		>
			{children}
			<span className="sr-only">{label}</span>
		</button>
	)
}


