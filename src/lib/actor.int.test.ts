import { describe, expect, it } from 'vitest'
import { signInAs } from '@test/mocks/clerk'
import { setRequestCookie } from '@test/mocks/next-headers'
import { createUser } from '@test/helpers/db'
import { prisma } from '@/lib/prisma'
import { getActor } from './actor'
import { DEMO_COOKIE, DEMO_TTL_MS, signDemoCookie } from './demo/cookie'

async function createDemo(id: string) {
  await prisma.user.create({ data: { id, email: `${id}@demo.invalid`, isDemo: true } })
}

describe('getActor', () => {
  it('nobody → null', async () => {
    expect(await getActor()).toBeNull()
  })

  it('a Clerk session → the user', async () => {
    signInAs('user_real1')
    expect(await getActor()).toEqual({ kind: 'user', id: 'user_real1' })
  })

  it('a valid demo cookie → the demo', async () => {
    await createDemo('demo_visitor01')
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_visitor01'))
    expect(await getActor()).toEqual({ kind: 'demo', id: 'demo_visitor01' })
  })

  it('a Clerk session always wins over a demo cookie', async () => {
    await createDemo('demo_visitor02')
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_visitor02'))
    signInAs('user_real2')
    expect(await getActor()).toEqual({ kind: 'user', id: 'user_real2' })
  })

  it('a valid cookie whose demo was purged → null', async () => {
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_purged001'))
    expect(await getActor()).toBeNull()
  })

  it('a valid cookie naming a row that is not a demo → null', async () => {
    await createUser('demo_notademo1')
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_notademo1'))
    expect(await getActor()).toBeNull()
  })

  it('an expired or forged cookie → null', async () => {
    await createDemo('demo_visitor03')
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_visitor03', Date.now() - DEMO_TTL_MS - 1))
    expect(await getActor()).toBeNull()
    setRequestCookie(DEMO_COOKIE, signDemoCookie('demo_visitor03').slice(0, -3) + 'abc')
    expect(await getActor()).toBeNull()
  })
})
