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
				const email = String(credentials?.email || '').trim()
				const password = String(credentials?.password || '')
				if (!email || !password) return null
				const user = await prisma.user.findUnique({ where: { email } })
				if (!user || !user.passwordHash) return null
				const ok = bcrypt.compareSync(password, user.passwordHash)
				if (!ok) return null
				return { id: user.id, email: user.email, name: user.name || '' }
			},
		}),
	],
	callbacks: {
		async jwt({ token }) {
			if (token?.email) {
				const u = await prisma.user.findUnique({ where: { email: token.email } })
				if (u) {
					const t = token as JWT & { uid?: string; roles?: Role[] }
					t.uid = u.id
					t.roles = u.roles
				}
			}
			return token
		},
		async session({ session, token }) {
			const t = token as JWT & { uid?: string; roles?: Role[] }
			const s = session as { user: DefaultSession['user'] & { id?: string; roles?: Role[] } }
			if (s.user) {
				s.user.id = t.uid
				s.user.roles = t.roles || []
			}
			return session
		},
	},
	pages: { signIn: '/auth/signin' },
}


