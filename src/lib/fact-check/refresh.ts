import { prisma } from '@/lib/prisma'
import { adaptedCvCheck, coverLetterCheck } from './summary'

/** After a new CV: the stored check results of every application, against that CV. */
export async function refreshFactChecks(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { cvText: true } })
  const apps = await prisma.application.findMany({
    where: { userId },
    select: { id: true, adaptedCvText: true, approvedCvTitle: true, coverLetter: true },
  })
  for (const app of apps) {
    await prisma.application.update({
      where: { id: app.id },
      data: {
        adaptedCvCheck: adaptedCvCheck(user?.cvText ?? null, app.adaptedCvText, app.approvedCvTitle) ?? undefined,
        coverLetterCheck: coverLetterCheck(user?.cvText ?? null, app.coverLetter) ?? undefined,
      },
    })
  }
}
