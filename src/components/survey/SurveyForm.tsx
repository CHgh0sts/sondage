'use client'

import { useState, useEffect, useMemo } from 'react'
import { CircleDot, CheckSquare, AlignLeft, CircleCheck, AlertCircle, User } from 'lucide-react'

interface AnswerOption {
  id: string
  text: string
  order: number
}

interface Question {
  id: string
  text: string
  type: string
  required: boolean
  allowFreeText: boolean
  order: number
  conditionalQuestionId: string | null
  conditionalAnswerId: string | null
  options: AnswerOption[]
}

interface Survey {
  id: string
  shortId: string
  isAnonymous: boolean
  questions: Question[]
}

interface Props {
  survey: Survey
  currentUser: { name: string } | null
}

type AnswerState = {
  selectedOptionId: string | null
  selectedOptionIds: Set<string>
  freeText: string
  freeTextSelected: boolean
}

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function SurveyForm({ survey, currentUser }: Props) {
  // Pour les sondages non-anonymes sans compte connecté
  const needsName = !survey.isAnonymous && !currentUser
  const [respondentFirstName, setRespondentFirstName] = useState('')
  const [respondentLastName, setRespondentLastName] = useState('')

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {}
    survey.questions.forEach((q) => {
      init[q.id] = {
        selectedOptionId: null,
        selectedOptionIds: new Set(),
        freeText: '',
        freeTextSelected: false,
      }
    })
    return init
  })

  const [submitted, setSubmitted] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const key = `survey_token_${survey.shortId}`
    const existing = localStorage.getItem(key)
    if (existing) {
      // Vérifier si ce token a déjà soumis (uniquement pour anonyme ou non-anonyme sans compte)
      if (survey.isAnonymous || needsName) {
        setAlreadyAnswered(true)
      }
      setToken(existing)
    } else {
      setToken(generateToken())
    }
  }, [survey.isAnonymous, survey.shortId, needsName])

  const visibleQuestions = useMemo(() => {
    return survey.questions.filter((q) => {
      if (!q.conditionalQuestionId || !q.conditionalAnswerId) return true
      const condAnswer = answers[q.conditionalQuestionId]
      if (!condAnswer) return false
      const condQ = survey.questions.find((qq) => qq.id === q.conditionalQuestionId)
      if (!condQ) return false
      if (condQ.type === 'SINGLE') return condAnswer.selectedOptionId === q.conditionalAnswerId
      if (condQ.type === 'MULTIPLE') return condAnswer.selectedOptionIds.has(q.conditionalAnswerId)
      return false
    })
  }, [survey.questions, answers])

  function updateSingle(questionId: string, optionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOptionId: optionId, freeTextSelected: false },
    }))
  }

  function updateSingleFreeText(questionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], selectedOptionId: null, freeTextSelected: true },
    }))
  }

  function toggleMultiple(questionId: string, optionId: string) {
    setAnswers((prev) => {
      const set = new Set(prev[questionId].selectedOptionIds)
      if (set.has(optionId)) set.delete(optionId)
      else set.add(optionId)
      return { ...prev, [questionId]: { ...prev[questionId], selectedOptionIds: set } }
    })
  }

  function toggleMultipleFreeText(questionId: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        freeTextSelected: !prev[questionId].freeTextSelected,
        freeText: prev[questionId].freeTextSelected ? '' : prev[questionId].freeText,
      },
    }))
  }

  function updateFreeText(questionId: string, text: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], freeText: text } }))
  }

  async function handleSubmit() {
    setError('')

    // Validation nom/prénom si non-anonyme sans compte
    if (needsName) {
      if (!respondentFirstName.trim()) {
        setError('Veuillez renseigner votre prénom.')
        return
      }
      if (!respondentLastName.trim()) {
        setError('Veuillez renseigner votre nom.')
        return
      }
    }

    // Validation des réponses
    for (const q of visibleQuestions) {
      if (!q.required) continue
      const a = answers[q.id]
      if (q.type === 'SINGLE' && !a.selectedOptionId && !a.freeTextSelected) {
        setError(`La question "${q.text}" est obligatoire.`)
        return
      }
      if (q.type === 'SINGLE' && a.freeTextSelected && !a.freeText.trim()) {
        setError(`Veuillez préciser votre réponse pour "${q.text}".`)
        return
      }
      if (q.type === 'MULTIPLE' && a.selectedOptionIds.size === 0 && !a.freeTextSelected) {
        setError(`La question "${q.text}" est obligatoire.`)
        return
      }
      if (q.type === 'MULTIPLE' && a.freeTextSelected && !a.freeText.trim()) {
        setError(`Veuillez préciser votre réponse pour "${q.text}".`)
        return
      }
      if (q.type === 'FREE_TEXT' && !a.freeText.trim()) {
        setError(`La question "${q.text}" est obligatoire.`)
        return
      }
    }

    setSubmitting(true)

    const answersPayload: Array<{
      questionId: string
      answerOptionId?: string | null
      freeText?: string | null
    }> = []

    for (const q of visibleQuestions) {
      const a = answers[q.id]
      if (q.type === 'SINGLE') {
        if (a.freeTextSelected) {
          answersPayload.push({ questionId: q.id, answerOptionId: null, freeText: a.freeText })
        } else if (a.selectedOptionId) {
          answersPayload.push({ questionId: q.id, answerOptionId: a.selectedOptionId })
        }
      } else if (q.type === 'MULTIPLE') {
        a.selectedOptionIds.forEach((optId) => {
          answersPayload.push({ questionId: q.id, answerOptionId: optId })
        })
        if (a.freeTextSelected && a.freeText.trim()) {
          answersPayload.push({ questionId: q.id, answerOptionId: null, freeText: a.freeText })
        }
      } else if (q.type === 'FREE_TEXT') {
        answersPayload.push({ questionId: q.id, freeText: a.freeText })
      }
    }

    const res = await fetch(`/api/surveys/${survey.shortId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: answersPayload,
        anonymousToken: token,
        respondentName: needsName
          ? `${respondentFirstName.trim()} ${respondentLastName.trim()}`
          : undefined,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      if (res.status === 409) { setAlreadyAnswered(true); return }
      setError(data.error || 'Erreur lors de la soumission.')
      return
    }

    // Marquer dans localStorage (anonyme + non-anonyme sans compte)
    if (survey.isAnonymous || needsName) {
      localStorage.setItem(`survey_token_${survey.shortId}`, token!)
    }
    setSubmitted(true)
  }

  if (alreadyAnswered && !submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <CircleCheck className="w-5 h-5 text-zinc-400" />
        </div>
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Déjà répondu</h2>
        <p className="text-sm text-zinc-500">Vous avez déjà soumis une réponse à ce sondage.</p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="card p-8 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
          <CircleCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Merci pour votre réponse</h2>
        <p className="text-sm text-zinc-500">Votre réponse a bien été enregistrée.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bloc identité — non-anonyme sans compte connecté */}
      {needsName && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Vos coordonnées</p>
              <p className="text-xs text-zinc-500">Ce sondage est nominatif — votre nom sera visible du créateur.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input"
                value={respondentFirstName}
                onChange={(e) => setRespondentFirstName(e.target.value)}
                placeholder="Jean"
                autoComplete="given-name"
                autoFocus
              />
            </div>
            <div>
              <label className="label">Nom <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input"
                value={respondentLastName}
                onChange={(e) => setRespondentLastName(e.target.value)}
                placeholder="Dupont"
                autoComplete="family-name"
              />
            </div>
          </div>
        </div>
      )}

      {/* Indicateur si connecté et sondage nominatif */}
      {!survey.isAnonymous && currentUser && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <User className="w-3.5 h-3.5 text-blue-600 flex-none" />
          <p className="text-xs text-blue-700">
            Vous répondez en tant que <span className="font-semibold">{currentUser.name}</span>
          </p>
        </div>
      )}

      {/* Questions */}
      {visibleQuestions.map((q) => {
        const a = answers[q.id]
        const questionNumber = survey.questions.findIndex((qq) => qq.id === q.id) + 1

        return (
          <div key={q.id} className="card p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex-none mt-0.5 text-xs font-semibold text-zinc-400 tabular-nums w-5 text-right">
                {questionNumber}.
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 leading-snug">
                  {q.text}
                  {q.required && <span className="text-red-400 ml-0.5">*</span>}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                  {q.type === 'SINGLE' && <><CircleDot className="w-3 h-3" /> Choix unique</>}
                  {q.type === 'MULTIPLE' && <><CheckSquare className="w-3 h-3" /> Plusieurs choix possibles</>}
                  {q.type === 'FREE_TEXT' && <><AlignLeft className="w-3 h-3" /> Réponse libre</>}
                </p>
              </div>
            </div>

            {/* SINGLE */}
            {q.type === 'SINGLE' && (
              <div className="space-y-2 pl-8">
                {q.options.map((opt) => {
                  const selected = a.selectedOptionId === opt.id
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        selected
                          ? 'border-zinc-900 bg-zinc-50'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                      }`}
                    >
                      <div className={`flex-none w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selected ? 'border-zinc-900' : 'border-zinc-300'
                      }`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-zinc-900" />}
                      </div>
                      <input type="radio" name={`q_${q.id}`} checked={selected} onChange={() => updateSingle(q.id, opt.id)} className="sr-only" />
                      <span className="text-zinc-800">{opt.text}</span>
                    </label>
                  )
                })}
                {q.allowFreeText && (
                  <div>
                    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      a.freeTextSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                    }`}>
                      <div className={`flex-none w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        a.freeTextSelected ? 'border-zinc-900' : 'border-zinc-300'
                      }`}>
                        {a.freeTextSelected && <div className="w-2 h-2 rounded-full bg-zinc-900" />}
                      </div>
                      <input type="radio" name={`q_${q.id}`} checked={a.freeTextSelected} onChange={() => updateSingleFreeText(q.id)} className="sr-only" />
                      <span className="text-zinc-400 italic text-sm">Autre</span>
                    </label>
                    {a.freeTextSelected && (
                      <input type="text" className="input mt-2" value={a.freeText} onChange={(e) => updateFreeText(q.id, e.target.value)} placeholder="Précisez…" autoFocus />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MULTIPLE */}
            {q.type === 'MULTIPLE' && (
              <div className="space-y-2 pl-8">
                {q.options.map((opt) => {
                  const selected = a.selectedOptionIds.has(opt.id)
                  return (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                        selected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                      }`}
                    >
                      <div className={`flex-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        selected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
                      }`}>
                        {selected && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" checked={selected} onChange={() => toggleMultiple(q.id, opt.id)} className="sr-only" />
                      <span className="text-zinc-800">{opt.text}</span>
                    </label>
                  )
                })}
                {q.allowFreeText && (
                  <div>
                    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                      a.freeTextSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'
                    }`}>
                      <div className={`flex-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        a.freeTextSelected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
                      }`}>
                        {a.freeTextSelected && (
                          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" checked={a.freeTextSelected} onChange={() => toggleMultipleFreeText(q.id)} className="sr-only" />
                      <span className="text-zinc-400 italic text-sm">Autre</span>
                    </label>
                    {a.freeTextSelected && (
                      <input type="text" className="input mt-2" value={a.freeText} onChange={(e) => updateFreeText(q.id, e.target.value)} placeholder="Précisez…" autoFocus />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* FREE TEXT */}
            {q.type === 'FREE_TEXT' && (
              <div className="pl-8">
                <textarea className="input resize-none" rows={3} value={a.freeText} onChange={(e) => updateFreeText(q.id, e.target.value)} placeholder="Votre réponse…" />
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-none" />
          {error}
        </div>
      )}

      <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary w-full py-2.5">
        {submitting ? 'Envoi en cours…' : 'Soumettre'}
      </button>

      <p className="text-center text-xs text-zinc-400">
        Propulsé par <a href="/" className="hover:underline underline-offset-2">Sondage</a>
      </p>
    </div>
  )
}
