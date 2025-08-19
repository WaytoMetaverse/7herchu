import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link'
import "./globals.css";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import UserNav from '@/components/auth/UserNav'
import MobileTabBar from '@/components/MobileTabBar'
import PWARegister from '@/components/PWARegister'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "磐石砌好厝",
  description: "活動與講師預約系統",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.jpg",
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#0e4c5c",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '磐石砌好厝',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
  },
};


export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <header className="sticky top-0 z-30 bg-transparent">
          <nav className="max-w-6xl mx-auto px-4 h-12 hidden md:flex items-center gap-5 text-sm text-gray-700">
            <Link href="/" className="flex items-center gap-2 mr-4">
              <img src="/logo.jpg" alt="磐石砌好厝" className="h-6 w-6 object-cover rounded-sm" />
              <span className="font-semibold tracking-wide">磐石砌好厝</span>
            </Link>
            <Link href="/calendar" className="hover:text-black">講師預約</Link>
            <Link href="/hall" className="hover:text-black">活動大廳</Link>
            <Link href="/group" className="hover:text-black">小組管理</Link>
            <Link href="/cards" className="hover:text-black">名片庫</Link>
            <Link href="/profile" className="hover:text-black ml-auto">個人資料</Link>
            <UserNav user={session?.user ?? null} />
          </nav>
        </header>
        <main className="pb-20 md:pb-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom))' }}>
          {children}
        </main>
        <PWARegister />
        <MobileTabBar />
      </body>
    </html>
  );
}
