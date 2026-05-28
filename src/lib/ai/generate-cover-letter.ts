import { groq, GROQ_MODEL } from '@/lib/groq'

export async function generateCoverLetter(
  cvText: string,
  offerText: string,
  company: string,
  role: string,
  language: 'FR' | 'EN'
): Promise<string> {
  const prompt =
    language === 'FR'
      ? `Tu es un expert en recrutement et rédaction de lettres de motivation.

Voici le profil du candidat (extrait de son CV):
${cvText}

Voici l'offre d'emploi pour le poste de ${role} chez ${company}:
${offerText}

Rédige une lettre de motivation professionnelle et personnalisée en français.

Rules:
- Longueur: 3 paragraphes, maximum 300 mots
- Paragraphe 1: accroche forte qui montre la connaissance de l'entreprise
- Paragraphe 2: 2-3 réalisations concrètes du CV qui matchent l'offre
- Paragraphe 3: closing enthousiaste avec call to action
- Ton: professionnel mais humain, pas générique
- NE PAS inventer des informations non présentes dans le CV
- Commencer directement par le contenu, sans "Objet:" ni en-tête

Réponds uniquement avec la lettre, sans explication.`
      : `You are an expert recruiter and cover letter writer.

Here is the candidate's profile (extracted from their CV):
${cvText}

Here is the job offer for ${role} at ${company}:
${offerText}

Write a professional and personalized cover letter in English.

Rules:
- Length: 3 paragraphs, maximum 300 words
- Paragraph 1: strong opening showing knowledge of the company
- Paragraph 2: 2-3 concrete achievements from the CV that match the offer
- Paragraph 3: enthusiastic closing with call to action
- Tone: professional but human, not generic
- DO NOT invent information not present in the CV
- Start directly with content, no "Subject:" or header

Respond only with the letter, no explanation.`

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2048,
    temperature: 0.4,
  })

  return response.choices[0]?.message?.content ?? ''
}
