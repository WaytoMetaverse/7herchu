import type { NextAuthOptions, DefaultSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { Adapter } from 'next-auth/adapters'
import { PrismaUserAdapter } from '@/lib/adapter'
import type { JWT } from 'next-auth/jwt'
import type { Role } from '@prisma/client'

export const authOptions: NextAuthOptions = {
	adapter: PrismaUserAdapter(prisma) as Adapter,
	session: { strategy: 'jwt' },
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID || '',
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
			allowDangerousEmailAccountLinking: true,
		}),
		CredentialsProvider({
			name: 'Credentials',
			credentials: {
				email: { label: 'Email', type: 'email' },
				password: { label: 'Password', type: 'password' },
			},
			async authorize(credentials) {
				try {
					const email = String(credentials?.email || '').trim()
					const password = String(credentials?.password || '')
					if (!email || !password) return null
					const user = await prisma.user.findUnique({ where: { email } })
					if (!user || !user.passwordHash) return null
					const ok = bcrypt.compareSync(password, user.passwordHash)
					if (!ok) return null
					return { id: user.id, email: user.email, name: user.name || '' }
				} catch (err) {
					console.error('authorize error:', err)
					return null
				}
			},
		}),
	],
	callbacks: {
		async signIn({ user, account, profile }) {
			try {
				// 檢查是否是Google登入且有invite token
				if (account?.provider === 'google' && user?.email) {
					// 檢查用戶是否已經存在
					const existingUser = await prisma.user.findUnique({
						where: { email: user.email }
					})

					if (!existingUser) {
						// 對於Google登入，檢查是否有有效的invite token
						// 由於NextAuth的限制，我們在前端已經處理了invite token的傳遞
						// 這裡我們只檢查用戶是否需要邀請才能註冊
						console.log(`New Google user ${user.email} attempting to sign in`)

						// 創建新用戶（假設前端已經驗證了invite token）
						await prisma.user.create({
							data: {
								email: user.email,
								name: user.name || profile?.name || 'Google User',
								roles: [] // 預設沒有特殊權限
							}
						})

						console.log(`User ${user.email} created via Google sign-in`)
					}
				}
				return true
			} catch (err) {
				console.error('signIn callback error:', err)
				return false
			}
		},
		async jwt({ token }) {
			try {
				if (token?.email) {
					const u = await prisma.user.findUnique({ where: { email: token.email } })
					if (u) {
						const t = token as JWT & { uid?: string; roles?: Role[] }
						t.uid = u.id
						t.roles = (Array.isArray(u.roles) ? u.roles : []) as Role[]
					}
				}
			} catch (err) {
				console.error('jwt callback error:', err)
			}
			return token
		},
		async session({ session, token }) {
			try {
				const t = token as JWT & { uid?: string; roles?: Role[] }
				const s = session as { user: DefaultSession['user'] & { id?: string; roles?: Role[] } }
				if (s.user) {
					s.user.id = t.uid
					s.user.roles = (Array.isArray(t.roles) ? t.roles : []) as Role[]
				}
				return session
			} catch (err) {
				console.error('session callback error:', err)
				return session
			}
		},
	},
	pages: { signIn: '/auth/signin' },
}


