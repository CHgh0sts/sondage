'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Download } from 'lucide-react'

interface Props {
  url: string
  title: string
  onClose: () => void
}

export default function QRModal({ url, title, onClose }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: '#18181b', light: '#ffffff' },
    }).then(setDataUrl)
  }, [url])

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-zinc-200 shadow-xl p-6 max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="font-semibold text-zinc-900 text-sm">{title}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Scannez pour répondre au sondage</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost p-1.5 -mr-1 -mt-1 text-zinc-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR */}
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="QR Code"
            className="w-full rounded-lg border border-zinc-100 mb-4"
          />
        ) : (
          <div className="w-full aspect-square bg-zinc-50 rounded-lg mb-4 animate-pulse" />
        )}

        {/* URL */}
        <code className="block text-xs bg-zinc-50 border border-zinc-200 text-zinc-600 px-3 py-2 rounded-lg font-mono break-all mb-4">
          {url}
        </code>

        <div className="flex gap-2">
          {dataUrl && (
            <a
              href={dataUrl}
              download="qr-sondage.png"
              className="btn-secondary btn-sm flex-1"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
          )}
          <button type="button" onClick={onClose} className="btn-primary btn-sm flex-1">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
