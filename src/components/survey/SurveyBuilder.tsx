'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  GitBranch,
  AlignLeft,
  CircleDot,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react'

type QuestionType = 'SINGLE' | 'MULTIPLE' | 'FREE_TEXT'

interface OptionForm {
  tempId: string
  text: string
}

interface QuestionForm {
  tempId: string
  text: string
  type: QuestionType
  required: boolean
  allowFreeText: boolean
  options: OptionForm[]
  conditionalQuestionTempId: string | null
  conditionalOptionTempId: string | null
}

// Données initiales passées en mode édition
export interface SurveyInitialData {
  id: string
  title: string
  description: string | null
  isAnonymous: boolean
  responseCount: number
  questions: Array<{
    id: string
    text: string
    type: string
    required: boolean
    allowFreeText: boolean
    order: number
    conditionalQuestionId: string | null
    conditionalAnswerId: string | null
    options: Array<{ id: string; text: string; order: number }>
  }>
}

interface Props {
  initialData?: SurveyInitialData
}

let _counter = 0
const uid = () => `tmp_${++_counter}_${Math.random().toString(36).slice(2, 7)}`

const DEFAULT_QUESTION = (): QuestionForm => ({
  tempId: uid(),
  text: '',
  type: 'SINGLE',
  required: true,
  allowFreeText: false,
  options: [
    { tempId: uid(), text: '' },
    { tempId: uid(), text: '' },
  ],
  conditionalQuestionTempId: null,
  conditionalOptionTempId: null,
})

const TYPE_CONFIG = {
  SINGLE: { label: 'Choix unique', icon: CircleDot },
  MULTIPLE: { label: 'Choix multiple', icon: CheckSquare },
  FREE_TEXT: { label: 'Réponse libre', icon: AlignLeft },
} as const

// Convertit les données existantes en format local (tempId = vrai id pour les refs conditionnelles)
function buildInitialQuestions(data: SurveyInitialData): QuestionForm[] {
  // Map real id → tempId (on réutilise le real id comme tempId pour simplifier)
  return data.questions.map((q) => ({
    tempId: q.id,
    text: q.text,
    type: q.type as QuestionType,
    required: q.required,
    allowFreeText: q.allowFreeText,
    options: q.options.map((o) => ({ tempId: o.id, text: o.text })),
    conditionalQuestionTempId: q.conditionalQuestionId,
    conditionalOptionTempId: q.conditionalAnswerId,
  }))
}

export default function SurveyBuilder({ initialData }: Props) {
  const router = useRouter()
  const isEdit = !!initialData

  const [title, setTitle] = useState(initialData?.title ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [isAnonymous, setIsAnonymous] = useState(initialData?.isAnonymous ?? false)
  const [questions, setQuestions] = useState<QuestionForm[]>(
    initialData ? buildInitialQuestions(initialData) : [DEFAULT_QUESTION()]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmEdit, setConfirmEdit] = useState(false)

  const responseCount = initialData?.responseCount ?? 0

  const updateQuestion = useCallback((idx: number, patch: Partial<QuestionForm>) => {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }, [])

  const addQuestion = () => setQuestions((prev) => [...prev, DEFAULT_QUESTION()])

  const removeQuestion = (idx: number) =>
    setQuestions((prev) => {
      const removed = prev[idx].tempId
      return prev
        .filter((_, i) => i !== idx)
        .map((q) => ({
          ...q,
          conditionalQuestionTempId:
            q.conditionalQuestionTempId === removed ? null : q.conditionalQuestionTempId,
          conditionalOptionTempId:
            q.conditionalQuestionTempId === removed ? null : q.conditionalOptionTempId,
        }))
    })

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    setQuestions((prev) => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  const addOption = (qIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...q.options, { tempId: uid(), text: '' }] } : q
      )
    )
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const removed = q.options[oIdx].tempId
        return {
          ...q,
          options: q.options.filter((_, oi) => oi !== oIdx),
          conditionalOptionTempId:
            q.conditionalOptionTempId === removed ? null : q.conditionalOptionTempId,
        }
      })
    )
  }

  const updateOption = (qIdx: number, oIdx: number, text: string) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i !== qIdx
          ? q
          : { ...q, options: q.options.map((o, oi) => (oi === oIdx ? { ...o, text } : o)) }
      )
    )

  const eligibleConditionQuestions = (qIdx: number) =>
    questions.slice(0, qIdx).filter((q) => q.type === 'SINGLE' || q.type === 'MULTIPLE')

  function validate() {
    if (!title.trim()) { setError('Le titre est requis.'); return false }
    if (questions.some((q) => !q.text.trim())) {
      setError('Toutes les questions doivent avoir un texte.'); return false
    }
    if (questions.some(
      (q) =>
        (q.type === 'SINGLE' || q.type === 'MULTIPLE') &&
        q.options.filter((o) => o.text.trim()).length < 2
    )) {
      setError('Les questions à choix doivent avoir au moins 2 options non vides.'); return false
    }
    return true
  }

  async function submit() {
    if (!validate()) return
    setError('')
    setSaving(true)

    const payload = {
      title,
      description,
      isAnonymous,
      questions: questions.map((q, i) => ({
        ...q,
        order: i,
        options: q.options.filter((o) => o.text.trim()).map((o, oi) => ({ ...o, order: oi })),
      })),
    }

    const res = await fetch(
      isEdit ? `/api/surveys/${initialData!.id}` : '/api/surveys',
      {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error || 'Erreur lors de la sauvegarde.')
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  function handleSubmit() {
    if (!validate()) return
    // En mode édition avec des réponses existantes : demander confirmation
    if (isEdit && responseCount > 0 && !confirmEdit) {
      setConfirmEdit(true)
      return
    }
    submit()
  }

  return (
    <div className="space-y-5">
      {/* Avertissement édition */}
      {isEdit && responseCount > 0 && !confirmEdit && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Ce sondage a déjà {responseCount} réponse{responseCount > 1 ? 's' : ''}</p>
            <p className="mt-0.5 text-amber-700">
              Toute modification supprimera définitivement les réponses existantes. Les répondants pourront répondre à nouveau.
            </p>
          </div>
        </div>
      )}

      {/* Confirmation requise */}
      {confirmEdit && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-none mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800 mb-1">Confirmer la suppression des réponses</p>
            <p className="text-sm text-red-700 mb-4">
              Les {responseCount} réponse{responseCount > 1 ? 's' : ''} seront supprimées définitivement et ne pourront pas être récupérées.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => { setConfirmEdit(false) }}
                className="btn-secondary btn-sm w-full sm:w-auto"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="btn-danger btn-sm w-full sm:w-auto"
              >
                {saving ? 'Sauvegarde…' : 'Confirmer et sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Infos générales */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900">Informations générales</h2>

        <div>
          <label className="label">Titre <span className="text-red-500">*</span></label>
          <input
            type="text"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Satisfaction client — Q1 2025"
          />
        </div>

        <div>
          <label className="label">
            Description{' '}
            <span className="text-zinc-400 font-normal">(optionnelle)</span>
          </label>
          <textarea
            className="input resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez l'objectif de ce sondage…"
          />
        </div>

        {/* Toggle anonyme */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-50 border border-zinc-200">
          <div>
            <p className="text-sm font-medium text-zinc-800">Réponses anonymes</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {isAnonymous
                ? 'Les identités ne sont pas collectées. Token navigateur anti-doublon actif.'
                : 'Les répondants doivent être connectés. Leurs noms apparaissent dans les résultats.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isAnonymous}
            onClick={() => setIsAnonymous(!isAnonymous)}
            className={`relative flex-none ml-4 h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 ${
              isAnonymous ? 'bg-zinc-900' : 'bg-zinc-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                isAnonymous ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, qIdx) => {
        const eligible = eligibleConditionQuestions(qIdx)
        const condQ = eligible.find((eq) => eq.tempId === q.conditionalQuestionTempId)
        const TypeIcon = TYPE_CONFIG[q.type].icon

        return (
          <div key={q.tempId} className="card">
            {/* En-tête */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-400 tabular-nums">Q{qIdx + 1}</span>
                <span className="text-zinc-300">·</span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <TypeIcon className="w-3.5 h-3.5" />
                  {TYPE_CONFIG[q.type].label}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => moveQuestion(qIdx, -1)}
                  disabled={qIdx === 0}
                  className="btn-ghost p-1.5 disabled:opacity-25"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveQuestion(qIdx, 1)}
                  disabled={qIdx === questions.length - 1}
                  className="btn-ghost p-1.5 disabled:opacity-25"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIdx)}
                  disabled={questions.length === 1}
                  className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-25"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Texte */}
              <input
                type="text"
                className="input text-sm font-medium"
                value={q.text}
                onChange={(e) => updateQuestion(qIdx, { text: e.target.value })}
                placeholder="Texte de la question…"
              />

              {/* Sélecteur de type */}
              <div className="flex gap-1.5 flex-wrap">
                {(Object.entries(TYPE_CONFIG) as [QuestionType, typeof TYPE_CONFIG[QuestionType]][]).map(
                  ([type, { label, icon: Icon }]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateQuestion(qIdx, { type })}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        q.type === type
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  )
                )}
              </div>

              {/* Options pour SINGLE / MULTIPLE */}
              {(q.type === 'SINGLE' || q.type === 'MULTIPLE') && (
                <div className="space-y-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={opt.tempId} className="flex items-center gap-2">
                      <div
                        className={`flex-none w-3.5 h-3.5 border-2 border-zinc-300 ${
                          q.type === 'SINGLE' ? 'rounded-full' : 'rounded-sm'
                        }`}
                      />
                      <input
                        type="text"
                        className="input flex-1 py-1.5 text-sm"
                        value={opt.text}
                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(qIdx, oIdx)}
                        disabled={q.options.length <= 2}
                        className="btn-ghost p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-25 flex-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addOption(qIdx)}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 transition-colors mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une option
                  </button>

                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={q.allowFreeText}
                      onChange={(e) => updateQuestion(qIdx, { allowFreeText: e.target.checked })}
                      className="w-3.5 h-3.5 rounded accent-zinc-900"
                    />
                    <span className="text-xs text-zinc-500">
                      Autoriser une réponse personnalisée (&ldquo;Autre&rdquo;)
                    </span>
                  </label>
                </div>
              )}

              {/* Obligatoire */}
              <div className="flex items-center gap-1 pt-1 border-t border-zinc-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(qIdx, { required: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-zinc-900"
                  />
                  <span className="text-xs text-zinc-500">Obligatoire</span>
                </label>
              </div>

              {/* Logique conditionnelle */}
              {qIdx > 0 && eligible.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700">
                    <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                    Condition d&apos;affichage
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      className="input py-1.5 text-xs bg-white"
                      value={q.conditionalQuestionTempId || ''}
                      onChange={(e) =>
                        updateQuestion(qIdx, {
                          conditionalQuestionTempId: e.target.value || null,
                          conditionalOptionTempId: null,
                        })
                      }
                    >
                      <option value="">Toujours afficher</option>
                      {eligible.map((eq, eqIdx) => (
                        <option key={eq.tempId} value={eq.tempId}>
                          Q{eqIdx + 1} — {eq.text || '(sans texte)'}
                        </option>
                      ))}
                    </select>

                    {condQ && (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs text-zinc-500">répond :</span>
                        <select
                          className="input py-1.5 text-xs bg-white"
                          value={q.conditionalOptionTempId || ''}
                          onChange={(e) =>
                            updateQuestion(qIdx, { conditionalOptionTempId: e.target.value || null })
                          }
                        >
                          <option value="">— choisir une réponse —</option>
                          {condQ.options
                            .filter((o) => o.text.trim())
                            .map((o) => (
                              <option key={o.tempId} value={o.tempId}>
                                {o.text}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Ajouter une question */}
      <button
        type="button"
        onClick={addQuestion}
        className="w-full py-3 border border-dashed border-zinc-300 rounded-xl text-sm text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Ajouter une question
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Actions — masquées quand la confirmation est affichée */}
      {!confirmEdit && (
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="btn-secondary w-full sm:w-auto">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary w-full sm:w-auto px-5"
          >
            {saving
              ? 'Sauvegarde…'
              : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer le sondage'}
          </button>
        </div>
      )}
    </div>
  )
}
