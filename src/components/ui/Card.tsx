import React from 'react'

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return (
		<div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
			{children}
		</div>
	)
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`px-4 py-3 border-b border-gray-100 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <h3 className={`text-base font-semibold text-gray-900 ${className}`}>{children}</h3>
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
	return <div className={`px-4 py-3 ${className}`}>{children}</div>
}


