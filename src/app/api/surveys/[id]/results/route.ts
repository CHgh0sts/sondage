import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUserFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  const { id } = await params

  const survey = await prisma.survey.findFirst({
    where: { OR: [{ id }, { shortId: id }], creatorId: user.userId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          options: { orderBy: { order: 'asc' } },
          answers: {
            include: {
              answerOption: true,
              response: {
                select: {
                  userId: true,
                  respondentName: true,
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      },
      _count: { select: { responses: true } },
    },
  })

  if (!survey) return NextResponse.json({ error: 'Sondage introuvable.' }, { status: 404 })

  return NextResponse.json({ survey })
}
