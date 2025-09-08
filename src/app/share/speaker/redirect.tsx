"use client"
import { useEffect } from 'react'

export default function ShareRedirectClient() {
	useEffect(() => {
		window.location.replace('/calendar')
	}, [])
	return null
}
