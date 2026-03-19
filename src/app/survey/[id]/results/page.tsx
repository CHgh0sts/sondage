import { getAuthUser } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ClipboardList, ChevronLeft, MessageSquare, HelpCircle, Lock, User } from 'lucide-react'

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const { id } = await params

  const survey = await prisma.survey.findFirst({
    where: { id, creatorId: user.userId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: { orderBy: { order: 'asc' } },
          answers: {
            include: {
              answerOption: true,
              response: {
                include: { user: { select: { name: true, email: true } } },
              },
            },
          },
        },
      },
      _count: { select: { responses: true } },
    },
  })

  if (!survey) notFound()

  const totalResponses = survey._count.responses

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 h-14 flex items-center gap-2 sm:gap-3 sticky top-0 z-10 min-w-0">
        <Link href="/dashboard" className="flex items-center gap-2 flex-none">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm hidden sm:block">Sondage</span>
        </Link>
        <span className="text-zinc-300 text-sm hidden sm:block">/</span>
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors hidden sm:block">
          Dashboard
        </Link>
        <span className="text-zinc-300 text-sm hidden sm:block">/</span>
        <span className="text-sm text-zinc-700 truncate">{survey.title}</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors mb-6"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Retour au dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">{survey.title}</h1>
          {survey.description && (
            <p className="text-sm text-zinc-500 mt-1">{survey.description}</p>
          )}

          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-3 py-2">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-900">{totalResponses}</span>
              <span className="text-sm text-zinc-500">réponse{totalResponses > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-zinc-200 rounded-lg px-3 py-2">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              <span className="text-sm font-semibold text-zinc-900">{survey.questions.length}</span>
              <span className="text-sm text-zinc-500">question{survey.questions.length > 1 ? 's' : ''}</span>
            </div>
            {survey.isAnonymous ? (
              <span className="badge-amber">
                <Lock className="w-3 h-3" /> Anonyme
              </span>
            ) : (
              <span className="badge-blue">
                <User className="w-3 h-3" /> Nominatif
              </span>
            )}
          </div>
        </div>

        {totalResponses === 0 && (
          <div className="card p-8 text-center mb-6">
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-5 h-5 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">Aucune réponse pour le moment.</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-5">
          {survey.questions.map((q, idx) => {
            const answeredCount = new Set(q.answers.map((a) => a.responseId)).size
            const pctAnswered = totalResponses > 0 ? Math.round((answeredCount / totalResponses) * 100) : 0

            return (
              <div key={q.id} className="card">
                {/* En-tête question */}
                <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-semibold text-zinc-400 tabular-nums mt-0.5">
                      Q{idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{q.text}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {q.type === 'SINGLE' ? 'Choix unique' :
                         q.type === 'MULTIPLE' ? 'Choix multiple' : 'Réponse libre'}
                      </p>
                    </div>
                  </div>
                  <div className="flex-none text-right">
                    <p className="text-sm font-semibold text-zinc-900">{answeredCount}</p>
                    <p className="text-xs text-zinc-400">{pctAnswered}%</p>
                  </div>
                </div>

                <div className="p-5">
                  {/* SINGLE / MULTIPLE */}
                  {(q.type === 'SINGLE' || q.type === 'MULTIPLE') && (
                    <div className="space-y-3">
                      {q.options.map((opt) => {
                        const count = q.answers.filter((a) => a.answerOptionId === opt.id).length
                        const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0

                        return (
                          <div key={opt.id}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-zinc-700">{opt.text}</span>
                              <span className="text-xs text-zinc-500 font-medium tabular-nums">
                                {count} · {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-zinc-800 rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}

                      {/* Réponses libres ("Autre") */}
                      {(() => {
                        const freeAnswers = q.answers.filter((a) => a.answerOptionId === null && a.freeText)
                        if (freeAnswers.length === 0) return null
                        const pct = Math.round((freeAnswers.length / answeredCount) * 100)

                        return (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-zinc-400 italic">Autre</span>
                              <span className="text-xs text-zinc-500 font-medium tabular-nums">
                                {freeAnswers.length} · {pct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden mb-3">
                              <div
                                className="h-full bg-zinc-400 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="space-y-1.5">
                              {freeAnswers.map((a) => (
                                <div
                                  key={a.id}
                                  className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4"
                                >
                                  <span>&ldquo;{a.freeText}&rdquo;</span>
                                  {!survey.isAnonymous && (a.response.user || a.response.respondentName) && (
                                    <span className="text-zinc-400 sm:shrink-0">
                                      {a.response.respondentName ?? a.response.user?.name}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* FREE TEXT */}
                  {q.type === 'FREE_TEXT' && (
                    <div className="space-y-2">
                      {q.answers.length === 0 ? (
                        <p className="text-sm text-zinc-400 italic">Aucune réponse</p>
                      ) : (
                        q.answers.map((a) => (
                          <div
                            key={a.id}
                            className="text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 px-3 py-2.5 rounded-md flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4"
                          >
                            <span className="leading-relaxed">&ldquo;{a.freeText}&rdquo;</span>
                            {!survey.isAnonymous && (a.response.user || a.response.respondentName) && (
                              <span className="text-xs text-zinc-400 sm:shrink-0 sm:mt-0.5">
                                {a.response.respondentName ?? a.response.user?.name}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
