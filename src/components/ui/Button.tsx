import React from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

type ButtonBaseProps = {
	as?: React.ElementType
	variant?: Variant
	size?: Size
	className?: string
	children?: React.ReactNode
} & Record<string, unknown>

export default function Button({
	children,
	as = 'button',
	variant = 'primary',
	size = 'md',
	className = '',
	...props
}: ButtonBaseProps) {
	const Comp = as || 'button'
	const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
	const sizes: Record<Size, string> = {
		sm: 'text-sm h-10 px-4',
		md: 'text-sm h-10 px-4',
		lg: 'text-sm h-10 px-4',
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


