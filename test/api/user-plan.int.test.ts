import { describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { signInAs } from '@test/mocks/clerk'
import { setRequestCookie } from '@test/mocks/next-headers'
import { createUser } from '@test/helpers/db'
import { readJson } from '@test/helpers/http'
import { DEMO_COOKIE, signDemoCookie } from '@/lib/demo/cookie'
import * as userPlan from '@/app/api/user/plan/route'

type PlanData = { data: { plan: string; demo: boolean; interviewFeedback: boolean } }

describe('GET /api/user/plan: who gets feedback on interview answers', () => {
  it('a free account: no (Pro feature)', async () => {
    await createUser('user_free_plan1')
    signInAs('user_free_plan1')
    expect((await readJson<PlanData>(await userPlan.GET())).data).toEqual({ plan: 'FREE', demo: false, interviewFeedback: false })
  })

  it('a Pro account: yes', async () => {
    await createUser('user_pro_plan1', { plan: 'PRO' })
    signInAs('user_pro_plan1')
    expect((await readJson<PlanData>(await userPlan.GET())).data).toEqual({ plan: 'PRO', demo: false, interviewFeedback: true })
  })

  it('a demo visitor: yes, within its daily feedback quota', async () => {
    await prisma.user.create({ data: { id: 'demo_feedback01', email: 'demo_feedback01@demo.invalid', isDemo: true } })
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_feedback01'))
    expect((await readJson<PlanData>(await userPlan.GET())).data).toEqual({ plan: 'FREE', demo: true, interviewFeedback: true })
  })
})
