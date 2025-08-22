"use client"
import React, { useEffect, useState } from 'react'

type Props = {
  url: string
  variant: 'card' | 'photo'
  deleteForm?: React.ReactNode
}

export default function ImageThumb({ url, variant, deleteForm }: Props) {
  const [isPortrait, setIsPortrait] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (variant !== 'card') return
    const img = new Image()
    img.onload = () => {
      setIsPortrait(img.naturalHeight > img.naturalWidth)
    }
    img.src = url
  }, [url, variant])

  const aspectClass = variant === 'photo' ? 'aspect-[16/9]' : (isPortrait ? 'aspect-[5/9]' : 'aspect-[9/5]')

  return (
    <>
      <div
        className={`relative ${aspectClass} w-full overflow-hidden rounded border bg-white cursor-zoom-in`}
        onClick={() => setOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="thumb" className="w-full h-full object-cover" />
        {deleteForm ? (
          <div className="absolute bottom-1 right-1" onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}>{deleteForm}</div>
        ) : null}
      </div>
      {open ? (
        <div
          className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-3"
          onClick={() => setOpen(false)}
          aria-modal
          role="dialog"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="preview" className="max-w-[92vw] max-h-[90vh] object-contain rounded-md shadow-lg" />
        </div>
      ) : null}
    </>
  )
}


