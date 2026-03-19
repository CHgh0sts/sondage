import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserFromRequest } from '@/lib/auth'

interface AnswerInput {
  questionId: string
  answerOptionId?: string | null
  freeText?: string | null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const survey = await prisma.survey.findFirst({
    where: { OR: [{ id }, { shortId: id }] },
  })

  if (!survey) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })
  if (!survey.isActive)
    return NextResponse.json({ error: 'Ce sondage est fermé.' }, { status: 403 })

  const user = await getAuthUserFromRequest(req)
  const body = await req.json()
  const { answers, anonymousToken, respondentName } = body as {
    answers: AnswerInput[]
    anonymousToken?: string
    respondentName?: string // Nom fourni pour les sondages non-anonymes sans compte
  }

  if (!answers || answers.length === 0) {
    return NextResponse.json({ error: 'Aucune réponse fournie.' }, { status: 400 })
  }

  if (survey.isAnonymous) {
    // Sondage anonyme : vérifier le doublon par token navigateur
    if (anonymousToken) {
      const existing = await prisma.response.findFirst({
        where: { surveyId: survey.id, anonymousToken },
      })
      if (existing) {
        return NextResponse.json({ error: 'Vous avez déjà répondu à ce sondage.' }, { status: 409 })
      }
    }

    await prisma.response.create({
      data: {
        surveyId: survey.id,
        anonymousToken: anonymousToken ?? null,
        answers: { create: answers.map((a) => ({ questionId: a.questionId, answerOptionId: a.answerOptionId ?? null, freeText: a.freeText ?? null })) },
      },
    })
  } else {
    // Sondage non-anonyme
    if (user) {
      // Utilisateur connecté : doublon par userId
      const existing = await prisma.response.findFirst({
        where: { surveyId: survey.id, userId: user.userId },
      })
      if (existing) {
        return NextResponse.json({ error: 'Vous avez déjà répondu à ce sondage.' }, { status: 409 })
      }

      await prisma.response.create({
        data: {
          surveyId: survey.id,
          userId: user.userId,
          answers: { create: answers.map((a) => ({ questionId: a.questionId, answerOptionId: a.answerOptionId ?? null, freeText: a.freeText ?? null })) },
        },
      })
    } else {
      // Utilisateur non connecté : nom obligatoire + doublon par token
      if (!respondentName?.trim()) {
        return NextResponse.json({ error: 'Veuillez renseigner votre nom.' }, { status: 400 })
      }
      if (anonymousToken) {
        const existing = await prisma.response.findFirst({
          where: { surveyId: survey.id, anonymousToken },
        })
        if (existing) {
          return NextResponse.json({ error: 'Vous avez déjà répondu à ce sondage.' }, { status: 409 })
        }
      }

      await prisma.response.create({
        data: {
          surveyId: survey.id,
          respondentName: respondentName.trim(),
          anonymousToken: anonymousToken ?? null,
          answers: { create: answers.map((a) => ({ questionId: a.questionId, answerOptionId: a.answerOptionId ?? null, freeText: a.freeText ?? null })) },
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
