import Link from 'next/link'
import { GitBranch, Lock, QrCode, ArrowRight, ClipboardList } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="border-b border-zinc-200 px-6 h-14 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm">Sondage</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary btn-sm">Se connecter</Link>
          <Link href="/register" className="btn-primary btn-sm">
            Créer un compte
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-full text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Disponible gratuitement
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-zinc-900 mb-5 leading-tight tracking-tight">
            Créez des sondages<br className="hidden sm:block" /> avec logique conditionnelle
          </h1>

          <p className="text-lg text-zinc-500 mb-10 max-w-lg mx-auto leading-relaxed">
            Posez les bonnes questions, au bon moment. Partagez via un lien court ou un QR code. Analysez les résultats en temps réel.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-5 py-2.5 text-sm">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-5 py-2.5 text-sm">
              Se connecter
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-zinc-200 bg-zinc-50 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: GitBranch,
              title: 'Logique conditionnelle',
              desc: 'Affichez ou masquez des questions selon les réponses précédentes.',
            },
            {
              icon: Lock,
              title: 'Anonyme ou nominatif',
              desc: 'Contrôlez la confidentialité. Un système anti-doublon est intégré.',
            },
            {
              icon: QrCode,
              title: 'Lien court & QR Code',
              desc: 'Partagez avec /s/XXXXX ou générez un QR code téléchargeable.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
                <Icon className="w-4 h-4 text-zinc-700" />
              </div>
              <h3 className="font-semibold text-zinc-900 text-sm">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-200 px-6 py-4 text-center">
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Sondage</p>
      </footer>
    </div>
  )
}
