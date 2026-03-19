import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sondage — Créez vos sondages facilement',
  description: 'Créez et partagez des sondages avec logique conditionnelle.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${geist.className} antialiased bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  )
}
