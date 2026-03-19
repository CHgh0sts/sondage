import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SurveyBuilder from '@/components/survey/SurveyBuilder'
import { ClipboardList, ChevronLeft } from 'lucide-react'

export default async function CreateSurveyPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2 flex-none">
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-zinc-900 text-sm hidden sm:block">Sondage</span>
          </Link>
          <span className="text-zinc-300 hidden sm:block">/</span>
          <span className="text-sm text-zinc-500 truncate">Nouveau sondage</span>
        </div>
        <span className="text-sm text-zinc-400 hidden md:block truncate max-w-[160px]">{user.name}</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors mb-5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Retour au dashboard
          </Link>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Créer un sondage</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Configurez vos questions et définissez la logique d&apos;affichage.
          </p>
        </div>

        <SurveyBuilder />
      </div>
    </div>
  )
}
