'use client'
import { useEffect } from 'react'

export default function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    let hasRefreshed = false
    const onControllerChange = () => {
      if (hasRefreshed) return
      hasRefreshed = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    const swUrl = '/sw.js'
    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register(swUrl, { scope: '/' })
        reg.update().catch(() => {})
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
        if (reg.waiting && navigator.serviceWorker.controller) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      } catch {
        // ignore
      }
    }
    register()

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])
  return null
}


