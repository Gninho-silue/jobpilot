import { NextRequest } from 'next/server'

const BASE = 'http://localhost:3000'

export function jsonRequest(path: string, body: unknown, method = 'POST'): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

export function emptyRequest(path: string, method = 'GET'): NextRequest {
  return new NextRequest(`${BASE}${path}`, { method })
}

export function formRequest(path: string, form: FormData): NextRequest {
  return new NextRequest(`${BASE}${path}`, { method: 'POST', body: form })
}

/** Second argument Next.js passes to dynamic route handlers. */
export function routeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

export async function readJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T
}
