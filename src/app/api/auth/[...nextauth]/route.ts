import NextAuth, { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
	adapter: PrismaAdapter(prisma) as any,
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
				return { id: user.id, email: user.email, name: user.name || '' } as any
			},
		}),
	],
	callbacks: {
		async jwt({ token }) {
			if (token?.email) {
				const u = await prisma.user.findUnique({ where: { email: token.email } })
				if (u) {
					;(token as any).uid = u.id
					;(token as any).roles = u.roles
				}
			}
			return token
		},
		async session({ session, token }) {
			;(session.user as any).id = (token as any).uid
			;(session.user as any).roles = (token as any).roles || []
			return session
		},
	},
	pages: { signIn: '/auth/signin' },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
