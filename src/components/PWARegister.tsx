'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const swUrl = '/sw.js'
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register(swUrl)
        return reg
      } catch (e) {
        // ignore
      }
    }
    register()
  }, [])
  return null
}


