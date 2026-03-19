'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CircleDot,
  CheckSquare,
  AlignLeft,
  CircleCheck,
  AlertCircle,
  User,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Send,
} from 'lucide-react'

interface AnswerOption { id: string; text: string; order: number }
interface Question {
  id: string; text: string; type: string; required: boolean
  allowFreeText: boolean; order: number
  conditionalQuestionId: string | null; conditionalAnswerId: string | null
  options: AnswerOption[]
}
interface Survey { id: string; shortId: string; isAnonymous: boolean; questions: Question[] }
interface Props { survey: Survey; currentUser: { name: string } | null }

type AnswerState = {
  selectedOptionId: string | null
  selectedOptionIds: Set<string>
  freeText: string
  freeTextSelected: boolean
}

type Step = 'identity' | number | 'summary'

function generateToken() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default function SurveyForm({ survey, currentUser }: Props) {
  const needsName = !survey.isAnonymous && !currentUser
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {}
    survey.questions.forEach((q) => {
      init[q.id] = { selectedOptionId: null, selectedOptionIds: new Set(), freeText: '', freeTextSelected: false }
    })
    return init
  })

  const initialStep: Step = needsName ? 'identity' : 0
  const [currentStep, setCurrentStep] = useState<Step>(initialStep)
  const [submitted, setSubmitted] = useState(false)
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const key = `survey_token_${survey.shortId}`
    const existing = localStorage.getItem(key)
    if (existing && (survey.isAnonymous || needsName)) {
      setAlreadyAnswered(true)
      setToken(existing)
    } else {
      setToken(generateToken())
    }
  }, [survey.isAnonymous, survey.shortId, needsName])

  // Clamp currentStep si les questions visibles changent
  useEffect(() => {
    if (typeof currentStep === 'number' && currentStep >= visibleQuestions.length && visibleQuestions.length > 0) {
      setCurrentStep(visibleQuestions.length - 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers])

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

  const totalSteps = visibleQuestions.length
  const currentQuestionIndex = typeof currentStep === 'number' ? currentStep : null
  const currentQuestion = currentQuestionIndex !== null ? visibleQuestions[currentQuestionIndex] : null
  const progressPct = currentStep === 'summary'
    ? 100
    : typeof currentStep === 'number'
    ? Math.round(((currentStep) / totalSteps) * 100)
    : 0

  // ── Mutations d'état des réponses ──────────────────────────────────────
  function updateSingle(qId: string, optId: string) {
    setAnswers((p) => ({ ...p, [qId]: { ...p[qId], selectedOptionId: optId, freeTextSelected: false } }))
  }
  function updateSingleFreeText(qId: string) {
    setAnswers((p) => ({ ...p, [qId]: { ...p[qId], selectedOptionId: null, freeTextSelected: true } }))
  }
  function toggleMultiple(qId: string, optId: string) {
    setAnswers((p) => {
      const set = new Set(p[qId].selectedOptionIds)
      set.has(optId) ? set.delete(optId) : set.add(optId)
      return { ...p, [qId]: { ...p[qId], selectedOptionIds: set } }
    })
  }
  function toggleMultipleFreeText(qId: string) {
    setAnswers((p) => ({
      ...p,
      [qId]: { ...p[qId], freeTextSelected: !p[qId].freeTextSelected, freeText: p[qId].freeTextSelected ? '' : p[qId].freeText },
    }))
  }
  function updateFreeText(qId: string, text: string) {
    setAnswers((p) => ({ ...p, [qId]: { ...p[qId], freeText: text } }))
  }

  // ── Validation d'une question ──────────────────────────────────────────
  function validateQuestion(q: Question): string | null {
    if (!q.required) return null
    const a = answers[q.id]
    if (q.type === 'SINGLE') {
      if (!a.selectedOptionId && !a.freeTextSelected) return 'Cette question est obligatoire.'
      if (a.freeTextSelected && !a.freeText.trim()) return 'Veuillez préciser votre réponse.'
    }
    if (q.type === 'MULTIPLE') {
      if (a.selectedOptionIds.size === 0 && !a.freeTextSelected) return 'Cette question est obligatoire.'
      if (a.freeTextSelected && !a.freeText.trim()) return 'Veuillez préciser votre réponse.'
    }
    if (q.type === 'FREE_TEXT' && !a.freeText.trim()) return 'Cette question est obligatoire.'
    return null
  }

  // ── Navigation ─────────────────────────────────────────────────────────
  function goNext() {
    setError('')
    if (currentStep === 'identity') {
      if (!firstName.trim()) { setError('Veuillez renseigner votre prénom.'); return }
      if (!lastName.trim()) { setError('Veuillez renseigner votre nom.'); return }
      setCurrentStep(0)
      return
    }
    if (typeof currentStep === 'number' && currentQuestion) {
      const err = validateQuestion(currentQuestion)
      if (err) { setError(err); return }
      if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1)
      else setCurrentStep('summary')
    }
  }

  function goPrev() {
    setError('')
    if (currentStep === 'summary') { setCurrentStep(totalSteps - 1); return }
    if (typeof currentStep === 'number') {
      if (currentStep === 0 && needsName) setCurrentStep('identity')
      else if (currentStep > 0) setCurrentStep(currentStep - 1)
    }
  }

  // ── Soumission ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('')
    setSubmitting(true)

    const answersPayload: Array<{ questionId: string; answerOptionId?: string | null; freeText?: string | null }> = []

    for (const q of visibleQuestions) {
      const a = answers[q.id]
      if (q.type === 'SINGLE') {
        if (a.freeTextSelected) answersPayload.push({ questionId: q.id, answerOptionId: null, freeText: a.freeText })
        else if (a.selectedOptionId) answersPayload.push({ questionId: q.id, answerOptionId: a.selectedOptionId })
      } else if (q.type === 'MULTIPLE') {
        a.selectedOptionIds.forEach((optId) => answersPayload.push({ questionId: q.id, answerOptionId: optId }))
        if (a.freeTextSelected && a.freeText.trim()) answersPayload.push({ questionId: q.id, answerOptionId: null, freeText: a.freeText })
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
        respondentName: needsName ? `${firstName.trim()} ${lastName.trim()}` : undefined,
      }),
    })

    const data = await res.json()
    setSubmitting(false)

    if (!res.ok) {
      if (res.status === 409) { setAlreadyAnswered(true); return }
      setError(data.error || 'Erreur lors de la soumission.')
      return
    }

    if (survey.isAnonymous || needsName) localStorage.setItem(`survey_token_${survey.shortId}`, token!)
    setSubmitted(true)
  }

  // ── Helper : résumé d'une réponse ──────────────────────────────────────
  function getAnswerSummary(q: Question): string[] {
    const a = answers[q.id]
    if (q.type === 'SINGLE') {
      if (a.freeTextSelected) return [a.freeText || '(réponse vide)']
      const opt = q.options.find((o) => o.id === a.selectedOptionId)
      return opt ? [opt.text] : ['(non répondu)']
    }
    if (q.type === 'MULTIPLE') {
      const selected = q.options.filter((o) => a.selectedOptionIds.has(o.id)).map((o) => o.text)
      if (a.freeTextSelected && a.freeText.trim()) selected.push(a.freeText)
      return selected.length ? selected : ['(non répondu)']
    }
    if (q.type === 'FREE_TEXT') return [a.freeText || '(non répondu)']
    return []
  }

  // ── États terminaux ────────────────────────────────────────────────────
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

  // ── Barre de progression (hors identité) ──────────────────────────────
  const showProgress = currentStep !== 'identity'
  const progressLabel = currentStep === 'summary'
    ? `Récapitulatif · ${totalSteps} question${totalSteps > 1 ? 's' : ''}`
    : typeof currentStep === 'number'
    ? `Question ${currentStep + 1} sur ${totalSteps}`
    : ''

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      {showProgress && totalSteps > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>{progressLabel}</span>
            <span className="font-medium text-zinc-700">{progressPct}%</span>
          </div>
          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-900 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── ÉTAPE IDENTITÉ ─────────────────────────────────────────────── */}
      {currentStep === 'identity' && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom <span className="text-red-500">*</span></label>
              <input type="text" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jean" autoComplete="given-name" autoFocus />
            </div>
            <div>
              <label className="label">Nom <span className="text-red-500">*</span></label>
              <input type="text" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)}
                placeholder="Dupont" autoComplete="family-name" />
            </div>
          </div>
        </div>
      )}

      {/* Indicateur si connecté */}
      {!survey.isAnonymous && currentUser && currentStep !== 'summary' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <User className="w-3.5 h-3.5 text-blue-600 flex-none" />
          <p className="text-xs text-blue-700">
            Vous répondez en tant que <span className="font-semibold">{currentUser.name}</span>
          </p>
        </div>
      )}

      {/* ── ÉTAPE QUESTION ─────────────────────────────────────────────── */}
      {currentQuestion && (
        <div className="card p-5">
          <div className="flex items-start gap-3 mb-5">
            <span className="flex-none mt-0.5 text-xs font-semibold text-zinc-400 tabular-nums w-5 text-right">
              {(currentQuestionIndex ?? 0) + 1}.
            </span>
            <div className="flex-1">
              <p className="text-base font-semibold text-zinc-900 leading-snug">
                {currentQuestion.text}
                {currentQuestion.required && <span className="text-red-400 ml-0.5">*</span>}
              </p>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                {currentQuestion.type === 'SINGLE' && <><CircleDot className="w-3 h-3" /> Choix unique</>}
                {currentQuestion.type === 'MULTIPLE' && <><CheckSquare className="w-3 h-3" /> Plusieurs choix possibles</>}
                {currentQuestion.type === 'FREE_TEXT' && <><AlignLeft className="w-3 h-3" /> Réponse libre</>}
              </p>
            </div>
          </div>

          {/* SINGLE */}
          {currentQuestion.type === 'SINGLE' && (() => {
            const a = answers[currentQuestion.id]
            return (
              <div className="space-y-2 pl-5 sm:pl-8">
                {currentQuestion.options.map((opt) => {
                  const sel = a.selectedOptionId === opt.id
                  return (
                    <label key={opt.id} className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${sel ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'}`}>
                      <div className={`flex-none w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${sel ? 'border-zinc-900' : 'border-zinc-300'}`}>
                        {sel && <div className="w-2 h-2 rounded-full bg-zinc-900" />}
                      </div>
                      <input type="radio" name={`q_${currentQuestion.id}`} checked={sel} onChange={() => updateSingle(currentQuestion.id, opt.id)} className="sr-only" />
                      <span className="text-sm text-zinc-800">{opt.text}</span>
                    </label>
                  )
                })}
                {currentQuestion.allowFreeText && (
                  <div>
                    <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${a.freeTextSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'}`}>
                      <div className={`flex-none w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${a.freeTextSelected ? 'border-zinc-900' : 'border-zinc-300'}`}>
                        {a.freeTextSelected && <div className="w-2 h-2 rounded-full bg-zinc-900" />}
                      </div>
                      <input type="radio" name={`q_${currentQuestion.id}`} checked={a.freeTextSelected} onChange={() => updateSingleFreeText(currentQuestion.id)} className="sr-only" />
                      <span className="text-sm text-zinc-400 italic">Autre</span>
                    </label>
                    {a.freeTextSelected && <input type="text" className="input mt-2" value={a.freeText} onChange={(e) => updateFreeText(currentQuestion.id, e.target.value)} placeholder="Précisez…" autoFocus />}
                  </div>
                )}
              </div>
            )
          })()}

          {/* MULTIPLE */}
          {currentQuestion.type === 'MULTIPLE' && (() => {
            const a = answers[currentQuestion.id]
            return (
              <div className="space-y-2 pl-5 sm:pl-8">
                {currentQuestion.options.map((opt) => {
                  const sel = a.selectedOptionIds.has(opt.id)
                  return (
                    <label key={opt.id} className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${sel ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'}`}>
                      <div className={`flex-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${sel ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'}`}>
                        {sel && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <input type="checkbox" checked={sel} onChange={() => toggleMultiple(currentQuestion.id, opt.id)} className="sr-only" />
                      <span className="text-sm text-zinc-800">{opt.text}</span>
                    </label>
                  )
                })}
                {currentQuestion.allowFreeText && (
                  <div>
                    <label className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors ${a.freeTextSelected ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50'}`}>
                      <div className={`flex-none w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${a.freeTextSelected ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'}`}>
                        {a.freeTextSelected && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                      <input type="checkbox" checked={a.freeTextSelected} onChange={() => toggleMultipleFreeText(currentQuestion.id)} className="sr-only" />
                      <span className="text-sm text-zinc-400 italic">Autre</span>
                    </label>
                    {a.freeTextSelected && <input type="text" className="input mt-2" value={a.freeText} onChange={(e) => updateFreeText(currentQuestion.id, e.target.value)} placeholder="Précisez…" autoFocus />}
                  </div>
                )}
              </div>
            )
          })()}

          {/* FREE TEXT */}
          {currentQuestion.type === 'FREE_TEXT' && (
            <div className="pl-5 sm:pl-8">
              <textarea className="input resize-none" rows={4} value={answers[currentQuestion.id].freeText}
                onChange={(e) => updateFreeText(currentQuestion.id, e.target.value)} placeholder="Votre réponse…" />
            </div>
          )}
        </div>
      )}

      {/* ── RÉCAPITULATIF ──────────────────────────────────────────────── */}
      {currentStep === 'summary' && (
        <div className="space-y-3">
          {/* Identité */}
          {needsName && (
            <div className="card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-zinc-400 mb-0.5">Répondant</p>
                <p className="text-sm font-medium text-zinc-900">{firstName} {lastName}</p>
              </div>
              <button type="button" onClick={() => setCurrentStep('identity')} className="btn-ghost btn-sm text-zinc-400 flex-none">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {visibleQuestions.map((q, idx) => (
            <div key={q.id} className="card p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-zinc-400 tabular-nums font-semibold">{idx + 1}.</span>
                  <p className="text-xs font-medium text-zinc-700 leading-snug">{q.text}</p>
                </div>
                <div className="pl-5 space-y-1">
                  {getAnswerSummary(q).map((s, i) => (
                    <p key={i} className="text-sm text-zinc-900 font-medium">{s}</p>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => setCurrentStep(idx)} className="btn-ghost btn-sm text-zinc-400 flex-none mt-0.5">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          <div className="card p-4 bg-zinc-50 flex items-start gap-3">
            <CircleCheck className="w-4 h-4 text-zinc-400 flex-none mt-0.5" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              Vérifiez vos réponses avant de soumettre. Cliquez sur le crayon pour modifier une réponse.
            </p>
          </div>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-none" />
          {error}
        </div>
      )}

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
        {/* Bouton précédent */}
        {currentStep !== initialStep ? (
          <button type="button" onClick={goPrev} className="btn-secondary w-full sm:w-auto">
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </button>
        ) : (
          <div className="hidden sm:block" />
        )}

        {/* Bouton suivant / soumettre */}
        {currentStep === 'summary' ? (
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary w-full sm:w-auto">
            <Send className="w-4 h-4" />
            {submitting ? 'Envoi…' : 'Valider et envoyer'}
          </button>
        ) : (
          <button type="button" onClick={goNext} className="btn-primary w-full sm:w-auto">
            {typeof currentStep === 'number' && currentStep === totalSteps - 1 ? 'Voir le récapitulatif' : 'Suivant'}
            {!(typeof currentStep === 'number' && currentStep === totalSteps - 1) && <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-zinc-400">
        Propulsé par <a href="/" className="hover:underline underline-offset-2">Sondage</a>
      </p>
    </div>
  )
}
