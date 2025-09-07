import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link'
import "./globals.css";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UserNav from '@/components/auth/UserNav'
import MobileTabBar from '@/components/MobileTabBar'
import PWARegister from '@/components/PWARegister'
import MobileLogout from '@/components/auth/MobileLogout'
import { prisma } from '@/lib/prisma'
import TopNavLinks from '@/components/TopNavLinks'
import SessionProvider from '@/components/auth/SessionProvider'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ['400','500','600'],
  display: 'swap',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ['400','500'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: "活動管理",
  description: "活動與講師預約系統",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#ffffff",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '活動管理',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};


export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions)
  let navUser: { name?: string | null; nickname?: string | null } | null = null
  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({ where: { email: session.user.email }, select: { name: true, nickname: true } })
    if (dbUser) navUser = { name: dbUser.name, nickname: (dbUser as unknown as { nickname?: string | null }).nickname ?? null }
  }
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <header className="sticky top-0 z-30 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">
            <nav className="max-w-6xl mx-auto px-5 h-[64px] hidden lg:flex items-center gap-6 text-[15px] text-gray-700">
              <Link href="/hall" className="flex items-center gap-2 mr-4">
                <img src="/brand-mark.png" alt="磐石砌好厝" className="h-8 w-8 object-contain" />
                <span className="font-semibold tracking-wide text-xl leading-none">磐石砌好厝</span>
              </Link>
              <TopNavLinks />
              <UserNav user={navUser ?? (session?.user as { name?: string | null; nickname?: string | null } | null)} />
            </nav>
          </header>
          <main className="page-wrap lg:pt-0 lg:pb-0">
            {children}
          </main>
          <PWARegister />
          <div className="md:hidden fixed top-0 inset-x-0 h-[56px] z-40 bg-white/70 backdrop-blur flex items-center px-3 gap-2 border-b">
            <Link href="/hall" className="flex items-center gap-2">
              <img src="/brand-mark.png" alt="磐石砌好厝" className="h-7 w-7 object-contain" />
              <span className="text-[15px] font-semibold tracking-wide">磐石砌好厝</span>
            </Link>
            <MobileLogout show={!!session?.user} />
          </div>
          <MobileTabBar />
        </SessionProvider>
      </body>
    </html>
  );
}
