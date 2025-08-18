import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from 'next/link'
import "./globals.css";
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import UserNav from '@/components/auth/UserNav'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "建築組活動",
  description: "活動與講師預約系統",
  icons: {
    icon: "/favicon.ico",
  },
};


export default async function RootLayout({ children, }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="zh-Hant">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <nav className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-5 text-sm text-gray-700">
            <Link href="/calendar" className="hover:text-black">講師預約</Link>
            <Link href="/hall" className="hover:text-black">活動大廳</Link>
            <Link href="/group" className="hover:text-black">小組管理</Link>
            <Link href="/cards" className="hover:text-black">名片庫</Link>
            <Link href="/profile" className="hover:text-black">個人資料</Link>
            <UserNav user={session?.user as any} />
          </nav>
        </div>
        {children}
      </body>
    </html>
  );
}
