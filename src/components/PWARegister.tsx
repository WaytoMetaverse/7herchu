'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const swUrl = '/sw.js'
    const register = async () => {
      try {
        await navigator.serviceWorker.register(swUrl)
      } catch {
        // ignore
      }
    }
    register()
  }, [])
  return null
}


