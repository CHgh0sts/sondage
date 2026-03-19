import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserFromRequest } from '@/lib/auth'
import { generateShortId } from '@/lib/utils'

// GET /api/surveys — liste des sondages de l'utilisateur connecté
export async function GET(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const surveys = await prisma.survey.findMany({
    where: { creatorId: user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { responses: true, questions: true } },
    },
  })

  return NextResponse.json({ surveys })
}

interface OptionInput {
  tempId: string
  text: string
  order: number
}

interface QuestionInput {
  tempId: string
  text: string
  type: string
  order: number
  required: boolean
  allowFreeText: boolean
  options: OptionInput[]
  conditionalQuestionTempId: string | null
  conditionalOptionTempId: string | null
}

// POST /api/surveys — créer un sondage
export async function POST(req: NextRequest) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const body = await req.json()
    const { title, description, isAnonymous, questions } = body as {
      title: string
      description?: string
      isAnonymous: boolean
      questions: QuestionInput[]
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
    }
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'Au moins une question est requise.' }, { status: 400 })
    }

    // Générer un shortId unique
    let shortId = generateShortId()
    let attempts = 0
    while (await prisma.survey.findUnique({ where: { shortId } })) {
      shortId = generateShortId()
      if (++attempts > 10) throw new Error('Impossible de générer un identifiant unique.')
    }

    // Créer le sondage avec toutes les questions et options en transaction
    const survey = await prisma.$transaction(async (tx) => {
      const created = await tx.survey.create({
        data: {
          shortId,
          title: title.trim(),
          description: description?.trim() || null,
          isAnonymous,
          creatorId: user.userId,
        },
      })

      // Map tempId → real IDs
      const questionIdMap = new Map<string, string>()
      const optionIdMap = new Map<string, string>()

      // 1ère passe : créer questions + options sans conditions
      for (const q of questions) {
        const createdQ = await tx.question.create({
          data: {
            surveyId: created.id,
            text: q.text.trim(),
            type: q.type,
            order: q.order,
            required: q.required,
            allowFreeText: q.allowFreeText,
          },
        })
        questionIdMap.set(q.tempId, createdQ.id)

        for (const opt of q.options) {
          const createdOpt = await tx.answerOption.create({
            data: {
              questionId: createdQ.id,
              text: opt.text.trim(),
              order: opt.order,
            },
          })
          optionIdMap.set(opt.tempId, createdOpt.id)
        }
      }

      // 2ème passe : mettre à jour les conditions
      for (const q of questions) {
        if (q.conditionalQuestionTempId || q.conditionalOptionTempId) {
          const realQId = questionIdMap.get(q.tempId)
          const condQId = q.conditionalQuestionTempId
            ? questionIdMap.get(q.conditionalQuestionTempId)
            : null
          const condOptId = q.conditionalOptionTempId
            ? optionIdMap.get(q.conditionalOptionTempId)
            : null

          if (realQId) {
            await tx.question.update({
              where: { id: realQId },
              data: {
                conditionalQuestionId: condQId || null,
                conditionalAnswerId: condOptId || null,
              },
            })
          }
        }
      }

      return created
    })

    return NextResponse.json({ survey }, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erreur lors de la création.' }, { status: 500 })
  }
}
