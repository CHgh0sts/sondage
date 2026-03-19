import Link from 'next/link'
import {
  GitBranch,
  Lock,
  QrCode,
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  BarChart2,
  Shield,
  Zap,
  Users,
  CheckCircle2,
} from 'lucide-react'
import { getAuthUser } from '@/lib/auth'

export default async function Home() {
  const user = await getAuthUser()

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Navbar ── */}
      <header className="border-b border-zinc-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center flex-none">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm">Sondage</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-zinc-500 hidden sm:block mr-2">
                Bonjour, <span className="font-medium text-zinc-700">{user.name.split(' ')[0]}</span>
              </span>
              <Link href="/dashboard" className="btn-primary btn-sm">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tableau de bord</span>
                <span className="sm:hidden">Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary btn-sm hidden sm:inline-flex">Se connecter</Link>
              <Link href="/register" className="btn-primary btn-sm">
                <span className="sm:hidden">Commencer</span>
                <span className="hidden sm:inline">Créer un compte</span>
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="flex-none px-4 sm:px-6 pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 border border-zinc-200 text-zinc-600 px-3 py-1.5 rounded-full text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-none animate-pulse"></span>
            Gratuit · Sans publicité · Open source
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold text-zinc-900 mb-5 leading-tight tracking-tight">
            Des sondages intelligents,<br className="hidden sm:block" />
            <span className="text-zinc-400"> en quelques minutes</span>
          </h1>

          <p className="text-base sm:text-xl text-zinc-500 mb-8 max-w-xl mx-auto leading-relaxed">
            Créez des sondages avec logique conditionnelle, partagez-les via un lien court ou un QR code, et analysez les résultats en temps réel.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            {user ? (
              <Link href="/dashboard" className="btn-primary w-full sm:w-auto px-6 py-3 text-sm">
                <LayoutDashboard className="w-4 h-4" />
                Accéder à mes sondages
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-primary w-full sm:w-auto px-6 py-3 text-sm">
                  Commencer gratuitement
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/login" className="btn-secondary w-full sm:w-auto px-6 py-3 text-sm">
                  Se connecter
                </Link>
              </>
            )}
          </div>

          {/* Mini feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
            {['Aucune carte de crédit', 'Réponses illimitées', 'Lien court /s/XXXXX', 'QR code inclus'].map((f) => (
              <span key={f} className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-none" />
                {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Aperçu UI (mockup CSS-only) ── */}
      <section className="px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 overflow-hidden shadow-sm">
            {/* Fausse barre navigateur */}
            <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2.5 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-zinc-300" />
                <div className="w-3 h-3 rounded-full bg-zinc-300" />
                <div className="w-3 h-3 rounded-full bg-zinc-300" />
              </div>
              <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-zinc-400 font-mono text-center max-w-xs mx-auto">
                sondage.app/s/a3Kx2
              </div>
            </div>
            {/* Fausse UI de sondage */}
            <div className="p-6 sm:p-8 bg-white">
              {/* Progress bar */}
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Question 2 sur 4</span>
                <span className="font-medium text-zinc-700">50%</span>
              </div>
              <div className="h-1.5 bg-zinc-100 rounded-full mb-6">
                <div className="h-full w-1/2 bg-zinc-900 rounded-full" />
              </div>

              <p className="font-semibold text-zinc-900 text-base mb-4">
                Comment avez-vous entendu parler de nous ?
                <span className="text-red-400 ml-0.5">*</span>
              </p>

              <div className="space-y-2 mb-6">
                {[
                  { label: 'Bouche à oreille', sel: false },
                  { label: 'Réseaux sociaux', sel: true },
                  { label: 'Moteur de recherche', sel: false },
                ].map(({ label, sel }) => (
                  <div key={label} className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm ${sel ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'}`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-none ${sel ? 'border-zinc-900' : 'border-zinc-300'}`}>
                      {sel && <div className="w-2 h-2 rounded-full bg-zinc-900" />}
                    </div>
                    <span className={sel ? 'text-zinc-900 font-medium' : 'text-zinc-600'}>{label}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <div className="w-20 h-8 rounded-lg border border-zinc-200 bg-zinc-50 flex items-center justify-center">
                  <span className="text-xs text-zinc-400">Précédent</span>
                </div>
                <div className="w-20 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                  <span className="text-xs text-white">Suivant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="border-t border-zinc-200 bg-zinc-50 px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Comment ça marche</h2>
            <p className="text-sm sm:text-base text-zinc-500 mt-2">Créez et partagez un sondage en moins de 5 minutes</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: '01',
                icon: ClipboardList,
                title: 'Créez votre sondage',
                desc: 'Ajoutez vos questions, définissez les types de réponses et configurez la logique conditionnelle.',
              },
              {
                step: '02',
                icon: QrCode,
                title: 'Partagez le lien',
                desc: 'Copiez le lien court /s/XXXXX ou téléchargez le QR code pour affichage physique.',
              },
              {
                step: '03',
                icon: BarChart2,
                title: 'Analysez les résultats',
                desc: 'Consultez les réponses en temps réel avec des graphiques de répartition par question.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative flex gap-4 sm:flex-col sm:gap-4">
                <div className="flex-none flex items-start sm:items-center gap-3 sm:gap-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center flex-none">
                    <Icon className="w-5 h-5 text-zinc-700" />
                  </div>
                  <span className="sm:hidden text-2xl font-black text-zinc-100 select-none leading-none mt-2 ml-auto">{step}</span>
                </div>
                <div>
                  <div className="hidden sm:flex items-center gap-2 mb-3">
                    <span className="text-3xl font-black text-zinc-100 select-none leading-none">{step}</span>
                  </div>
                  <h3 className="font-semibold text-zinc-900 text-sm mb-1.5">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section className="px-4 sm:px-6 py-14 sm:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight">Tout ce dont vous avez besoin</h2>
            <p className="text-sm sm:text-base text-zinc-500 mt-2">Aucun outil externe, tout est inclus</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: GitBranch, title: 'Logique conditionnelle', desc: 'Affichez ou masquez des questions selon les réponses précédentes pour un parcours personnalisé.' },
              { icon: Lock, title: 'Anonyme ou nominatif', desc: 'Choisissez si les répondants doivent s\'identifier. Système anti-doublon intégré dans les deux cas.' },
              { icon: QrCode, title: 'Lien court & QR Code', desc: 'Chaque sondage reçoit un lien /s/XXXXX unique et un QR code téléchargeable.' },
              { icon: Shield, title: 'Anti-doublon', desc: 'Empêche une même personne de répondre plusieurs fois — même en mode anonyme via token navigateur.' },
              { icon: Zap, title: 'Résultats en temps réel', desc: 'Consultez les réponses et les graphiques de répartition au fur et à mesure qu\'ils arrivent.' },
              { icon: Users, title: 'Répondants sans compte', desc: 'En mode nominatif, les participants peuvent indiquer leur nom sans créer de compte.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-5 rounded-xl border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-zinc-700" />
                </div>
                <h3 className="font-semibold text-zinc-900 text-sm mb-1.5">{title}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final (seulement si non connecté) ── */}
      {!user && (
        <section className="px-4 sm:px-6 py-14 sm:py-20 bg-zinc-900">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
              Prêt à créer votre premier sondage ?
            </h2>
            <p className="text-zinc-400 mb-8 text-sm sm:text-base">
              Gratuit, sans limite de sondages ni de réponses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg bg-white text-zinc-900 font-medium text-sm hover:bg-zinc-100 transition-colors">
                Créer un compte gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-lg border border-zinc-700 text-zinc-300 font-medium text-sm hover:bg-zinc-800 hover:text-white transition-colors">
                Se connecter
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-zinc-900 rounded flex items-center justify-center">
              <ClipboardList className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-zinc-600">Sondage</span>
          </div>
          <p>© {new Date().getFullYear()} Sondage — Tous droits réservés</p>
          {user ? (
            <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
              Tableau de bord →
            </Link>
          ) : (
            <Link href="/register" className="text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
              Commencer gratuitement →
            </Link>
          )}
        </div>
      </footer>
    </div>
  )
}
