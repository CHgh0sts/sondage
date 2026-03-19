'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Copy, ExternalLink, QrCode, BarChart2, Trash2,
  CircleSlash, CircleCheck, Lock, User, MessageSquare,
  HelpCircle, Plus, Check, Pencil,
} from 'lucide-react'
import QRModal from './QRModal'

interface SurveyItem {
  id: string; shortId: string; title: string; description: string | null
  isAnonymous: boolean; isActive: boolean; createdAt: Date
  _count: { responses: number; questions: number }
}

export default function DashboardClient({ surveys: initialSurveys }: { surveys: SurveyItem[] }) {
  const router = useRouter()
  const [surveys, setSurveys] = useState(initialSurveys)
  const [qrSurvey, setQrSurvey] = useState<SurveyItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  async function toggleActive(survey: SurveyItem) {
    const res = await fetch(`/api/surveys/${survey.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !survey.isActive }),
    })
    if (res.ok) setSurveys((prev) => prev.map((s) => s.id === survey.id ? { ...s, isActive: !s.isActive } : s))
  }

  async function deleteSurvey(id: string) {
    if (!confirm('Supprimer ce sondage ? Toutes les réponses seront perdues.')) return
    setDeletingId(id)
    const res = await fetch(`/api/surveys/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    if (res.ok) { setSurveys((prev) => prev.filter((s) => s.id !== id)); router.refresh() }
  }

  function copyLink(shortId: string) {
    navigator.clipboard.writeText(`${baseUrl}/s/${shortId}`)
    setCopiedId(shortId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (surveys.length === 0) {
    return (
      <div className="card border-dashed p-10 sm:p-12 text-center">
        <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-5 h-5 text-zinc-400" />
        </div>
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Aucun sondage</h2>
        <p className="text-sm text-zinc-500 mb-5">Créez votre premier sondage en quelques minutes.</p>
        <Link href="/survey/create" className="btn-primary btn-sm mx-auto">
          <Plus className="w-4 h-4" /> Créer un sondage
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {surveys.map((survey) => {
          const url = `${baseUrl}/s/${survey.shortId}`
          return (
            <div key={survey.id} className="card p-4 sm:p-5">
              {/* Ligne 1 : titre + badges */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 flex-wrap min-w-0">
                  <h3 className="font-semibold text-zinc-900 text-sm leading-snug">{survey.title}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {survey.isActive
                      ? <span className="badge-green"><CircleCheck className="w-3 h-3" /> Actif</span>
                      : <span className="badge-zinc"><CircleSlash className="w-3 h-3" /> Fermé</span>}
                    {survey.isAnonymous
                      ? <span className="badge-amber"><Lock className="w-3 h-3" /> Anonyme</span>
                      : <span className="badge-blue"><User className="w-3 h-3" /> Nominatif</span>}
                  </div>
                </div>
              </div>

              {survey.description && (
                <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{survey.description}</p>
              )}

              {/* Ligne 2 : stats + lien */}
              <div className="flex items-center gap-3 text-xs text-zinc-400 mb-3">
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {survey._count.questions} question{survey._count.questions > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {survey._count.responses} réponse{survey._count.responses > 1 ? 's' : ''}
                </span>
                <span className="hidden sm:block">
                  {new Date(survey.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>

              {/* Ligne 3 : lien court + actions */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {/* Lien — masqué sur mobile */}
                <div className="hidden sm:flex items-center gap-1">
                  <code className="text-xs bg-zinc-50 border border-zinc-200 text-zinc-600 px-2 py-1 rounded font-mono">
                    /s/{survey.shortId}
                  </code>
                  <button type="button" onClick={() => copyLink(survey.shortId)} title="Copier"
                    className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                    {copiedId === survey.shortId
                      ? <Check className="w-3.5 h-3.5 text-emerald-600" />
                      : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" title="Ouvrir"
                    className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Boutons d'action — icône seule sur mobile, icône+texte sur sm+ */}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setQrSurvey(survey)}
                    className="btn-secondary btn-sm" title="QR Code">
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">QR Code</span>
                  </button>

                  <Link href={`/survey/${survey.id}/results`} className="btn-secondary btn-sm" title="Résultats">
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Résultats</span>
                  </Link>

                  <Link href={`/survey/${survey.id}/edit`} className="btn-secondary btn-sm" title="Modifier">
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Modifier</span>
                  </Link>

                  <button type="button" onClick={() => toggleActive(survey)}
                    className="btn-secondary btn-sm" title={survey.isActive ? 'Fermer' : 'Rouvrir'}>
                    {survey.isActive
                      ? <><CircleSlash className="w-3.5 h-3.5" /><span className="hidden sm:inline">Fermer</span></>
                      : <><CircleCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">Rouvrir</span></>}
                  </button>

                  <button type="button" onClick={() => deleteSurvey(survey.id)}
                    disabled={deletingId === survey.id} title="Supprimer"
                    className="btn-ghost btn-sm text-red-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {qrSurvey && (
        <QRModal
          url={`${baseUrl}/s/${qrSurvey.shortId}`}
          title={qrSurvey.title}
          onClose={() => setQrSurvey(null)}
        />
      )}
    </>
  )
}
