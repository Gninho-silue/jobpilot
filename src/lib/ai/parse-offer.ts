import { GROQ_MODEL } from '@/lib/groq'
import { completeChat } from './call'
import { UNTRUSTED_DATA_RULE, wrapUntrusted } from './untrusted'

// Company, role and salary are near the top of a posting: 3000 characters keep
// this call small (128 output tokens).
const PARSE_OFFER_MAX_CHARS = 3000

export interface ParsedOffer {
  company: string | null
  role: string | null
  salary: string | null
}

export async function parseJobOffer(
  offerText: string,
  language: 'FR' | 'EN' = 'EN'
): Promise<ParsedOffer> {
  const langHint = language === 'FR' ? 'The job posting is in French.' : 'The job posting is in English.'

  const completion = await completeChat('parse-offer', {
    model: GROQ_MODEL,
    temperature: 0,
    max_tokens: 128,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You extract structured data from job postings. ${langHint} Extract the company name, job title/role, and salary (if mentioned) from the job posting in <job_offer>. Return only a JSON object with exactly three keys: "company" (string or null), "role" (string or null), "salary" (string or null). Do not add any other keys or explanation.\n\n${UNTRUSTED_DATA_RULE}`,
      },
      {
        role: 'user',
        content: wrapUntrusted('job_offer', offerText, PARSE_OFFER_MAX_CHARS),
      },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      company: typeof parsed['company'] === 'string' ? parsed['company'] : null,
      role: typeof parsed['role'] === 'string' ? parsed['role'] : null,
      salary: typeof parsed['salary'] === 'string' ? parsed['salary'] : null,
    }
  } catch {
    return { company: null, role: null, salary: null }
  }
}
