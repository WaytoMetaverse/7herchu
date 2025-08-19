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
	const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99]'
	const sizes: Record<Size, string> = {
		sm: 'text-sm h-10 px-4',
		md: 'text-sm h-10 px-4',
		lg: 'text-sm h-10 px-4',
	}
	// 中性、耐看的配色（不使用品牌色）
	const styles: Record<Variant, string> = {
		// 柔和青綠主色，對比佳但不刺眼
		primary: 'bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-600 shadow-sm',
		// 輕量中性底，適合次要動作
		secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 focus:ring-teal-300 shadow-sm',
		// 邊框款，滑過輕微提亮
		outline: 'bg-transparent text-slate-900 border border-slate-300 hover:bg-slate-50 focus:ring-teal-300',
		// 文字/透明款，滑過加淡灰背景
		ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-teal-200',
		// 柔和玫瑰色的危險動作
		danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600',
		// 品牌色（來自 globals.css 的 --brand-*）
		brand: 'bg-[var(--brand-600)] text-white hover:bg-[var(--brand-700)] focus:ring-[var(--brand-700)] shadow-sm',
	}
	return (
		<Comp className={`${base} ${sizes[size]} ${styles[variant]} ${className}`} {...props}>
			{children}
		</Comp>
	)
}


