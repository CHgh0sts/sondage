import { getAuthUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import DashboardClient from '@/components/survey/DashboardClient'
import LogoutClientButton from '@/components/LogoutClientButton'
import { ClipboardList, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const surveys = await prisma.survey.findMany({
    where: { creatorId: user.userId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { responses: true, questions: true } },
    },
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center flex-none">
            <ClipboardList className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 text-sm">Sondage</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-sm text-zinc-500 hidden md:block truncate max-w-[160px]">{user.name}</span>
          <LogoutClientButton />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">Mes sondages</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {surveys.length} sondage{surveys.length > 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/survey/create" className="btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau sondage</span>
            <span className="sm:hidden">Nouveau</span>
          </Link>
        </div>

        <DashboardClient surveys={surveys} />
      </div>
    </div>
  )
}
