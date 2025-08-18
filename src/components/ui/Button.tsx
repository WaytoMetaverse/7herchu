import React from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

export default function Button({
	children,
	as = 'button',
	variant = 'primary',
	size = 'md',
	className = '',
	...props
}: { as?: any; variant?: Variant; size?: Size; className?: string } & Record<string, any>) {
	const Comp: any = as
	const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
	const sizes: Record<Size, string> = {
		sm: 'text-sm h-8 px-3',
		md: 'text-sm h-10 px-4',
		lg: 'text-base h-12 px-6',
	}
	// 中性、耐看的配色（不使用品牌色）
	const styles: Record<Variant, string> = {
		primary: 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-800',
		secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
		outline: 'bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-50 focus:ring-gray-300',
		ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
		danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
	}
	return (
		<Comp className={`${base} ${sizes[size]} ${styles[variant]} ${className}`} {...props}>
			{children}
		</Comp>
	)
}


