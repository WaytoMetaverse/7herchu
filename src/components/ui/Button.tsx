import React from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'brand'
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
	const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]'
	const sizes: Record<Size, string> = {
		sm: 'text-[13px] h-9 px-3',
		md: 'text-[15px] h-10 px-4',
		lg: 'text-base h-11 px-5',
	}
	// 中性、耐看的配色（不使用品牌色）
	const styles: Record<Variant, string> = {
		// 全站主色改為品牌色，降低飽和陰影更細緻
		primary: 'bg-[var(--brand-600)] text-white hover:bg-[color-mix(in_oklab,_var(--brand-600)_92%,_black)] focus:ring-[color-mix(in_oklab,_var(--brand-600)_50%,_white)] shadow-sm',
		// 輕量中性底，與品牌色協調
		secondary: 'bg-slate-50 text-slate-900 hover:bg-slate-100 focus:ring-[color-mix(in_oklab,_var(--brand-600)_35%,_white)] shadow-sm',
		// 邊框款，使用品牌色邊框但低對比
		outline: 'bg-transparent text-slate-900 border border-[color-mix(in_oklab,_var(--brand-600)_35%,_white)] hover:bg-slate-50 focus:ring-[color-mix(in_oklab,_var(--brand-600)_40%,_white)]',
		// 文字/透明款
		ghost: 'bg-transparent text-[var(--brand-700)] hover:bg-slate-50 focus:ring-[color-mix(in_oklab,_var(--brand-600)_30%,_white)]',
		// 柔和玫瑰色的危險動作
		danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
		// 額外提供 brand 同義
		brand: 'bg-[var(--brand-600)] text-white hover:bg-[color-mix(in_oklab,_var(--brand-600)_92%,_black)] focus:ring-[color-mix(in_oklab,_var(--brand-600)_50%,_white)] shadow-sm',
	}
	return (
		<Comp className={`${base} ${sizes[size]} ${styles[variant]} ${className}`} {...props}>
			{children}
		</Comp>
	)
}


