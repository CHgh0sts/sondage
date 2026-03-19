import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import SurveyForm from '@/components/survey/SurveyForm'
import Link from 'next/link'
import { ClipboardList, Lock, User } from 'lucide-react'

export default async function SurveyResponsePage({
  params,
}: {
  params: Promise<{ shortId: string }>
}) {
  const { shortId } = await params

  const [survey, currentUser] = await Promise.all([
    prisma.survey.findUnique({
      where: { shortId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    }),
    getAuthUser(),
  ])

  if (!survey) notFound()

  if (!survey.isActive) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
        <div className="card p-10 text-center max-w-sm w-full">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-zinc-400" />
          </div>
          <h1 className="text-base font-semibold text-zinc-900 mb-1">Sondage fermé</h1>
          <p className="text-sm text-zinc-500">Ce sondage n&apos;accepte plus de nouvelles réponses.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 h-12 flex items-center">
        <Link href="/" className="flex items-center gap-1.5">
          <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-xs">Sondage</span>
        </Link>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight leading-tight">
            {survey.title}
          </h1>
          {survey.description && (
            <p className="text-sm text-zinc-500 mt-2 leading-relaxed">{survey.description}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            {survey.isAnonymous ? (
              <span className="badge-amber">
                <Lock className="w-3 h-3" /> Anonyme
              </span>
            ) : (
              <span className="badge-blue">
                <User className="w-3 h-3" /> Nominatif
              </span>
            )}
            <span className="text-xs text-zinc-400">
              {survey.questions.length} question{survey.questions.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <SurveyForm
          survey={survey}
          currentUser={currentUser ? { name: currentUser.name } : null}
        />
      </div>
    </div>
  )
}
