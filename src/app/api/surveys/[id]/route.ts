import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserFromRequest } from '@/lib/auth'

// GET /api/surveys/[id] — détail d'un sondage (par shortId ou cuid)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const survey = await prisma.survey.findFirst({
    where: { OR: [{ id }, { shortId: id }] },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: { orderBy: { order: 'asc' } },
        },
      },
    },
  })

  if (!survey) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })

  return NextResponse.json({ survey })
}

// PATCH /api/surveys/[id] — modifier isActive
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const survey = await prisma.survey.findFirst({ where: { id, creatorId: user.userId } })
  if (!survey) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })

  const updated = await prisma.survey.update({
    where: { id },
    data: { isActive: body.isActive ?? survey.isActive },
  })

  return NextResponse.json({ survey: updated })
}

// PUT /api/surveys/[id] — modifier un sondage (supprime toutes les réponses + recrée les questions)
interface OptionInput { tempId: string; text: string; order: number }
interface QuestionInput {
  tempId: string; text: string; type: string; order: number
  required: boolean; allowFreeText: boolean; options: OptionInput[]
  conditionalQuestionTempId: string | null; conditionalOptionTempId: string | null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { id } = await params
  const survey = await prisma.survey.findFirst({ where: { id, creatorId: user.userId } })
  if (!survey) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })

  const body = await req.json()
  const { title, description, isAnonymous, questions } = body as {
    title: string; description?: string; isAnonymous: boolean; questions: QuestionInput[]
  }

  if (!title?.trim()) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
  if (!questions?.length) return NextResponse.json({ error: 'Au moins une question est requise.' }, { status: 400 })

  await prisma.$transaction(async (tx) => {
    // 1. Supprimer toutes les réponses (cascade sur les answers)
    await tx.response.deleteMany({ where: { surveyId: id } })
    // 2. Supprimer toutes les questions (cascade sur les options)
    await tx.question.deleteMany({ where: { surveyId: id } })
    // 3. Mettre à jour le sondage
    await tx.survey.update({
      where: { id },
      data: { title: title.trim(), description: description?.trim() || null, isAnonymous },
    })

    // 4. Recréer questions + options (2 passes pour les conditions)
    const questionIdMap = new Map<string, string>()
    const optionIdMap = new Map<string, string>()

    for (const q of questions) {
      const createdQ = await tx.question.create({
        data: { surveyId: id, text: q.text.trim(), type: q.type, order: q.order, required: q.required, allowFreeText: q.allowFreeText },
      })
      questionIdMap.set(q.tempId, createdQ.id)
      for (const opt of q.options) {
        const createdOpt = await tx.answerOption.create({
          data: { questionId: createdQ.id, text: opt.text.trim(), order: opt.order },
        })
        optionIdMap.set(opt.tempId, createdOpt.id)
      }
    }

    for (const q of questions) {
      if (q.conditionalQuestionTempId || q.conditionalOptionTempId) {
        const realQId = questionIdMap.get(q.tempId)
        const condQId = q.conditionalQuestionTempId ? questionIdMap.get(q.conditionalQuestionTempId) : null
        const condOptId = q.conditionalOptionTempId ? optionIdMap.get(q.conditionalOptionTempId) : null
        if (realQId) {
          await tx.question.update({ where: { id: realQId }, data: { conditionalQuestionId: condQId || null, conditionalAnswerId: condOptId || null } })
        }
      }
    }
  })

  const updated = await prisma.survey.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: 'asc' }, include: { options: { orderBy: { order: 'asc' } } } } },
  })

  return NextResponse.json({ survey: updated })
}

// DELETE /api/surveys/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { id } = await params
  const survey = await prisma.survey.findFirst({ where: { id, creatorId: user.userId } })
  if (!survey) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })

  await prisma.survey.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
