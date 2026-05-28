import { groq, GROQ_MODEL } from '@/lib/groq'

export async function adaptResume(
  cvText: string,
  offerText: string,
  language: 'FR' | 'EN'
): Promise<string> {
  const prompt =
    language === 'FR'
      ? `Tu es un expert en recrutement et rédaction de CV.

Voici le CV du candidat:
${cvText}

Voici l'offre d'emploi:
${offerText}

Adapte le CV pour maximiser les chances de sélection:
- Réordonne les compétences pour mettre en avant celles demandées dans l'offre
- Reformule les expériences pour aligner avec les mots-clés de l'offre
- Garde TOUTES les informations vraies, n'invente rien
- Conserve la structure professionnelle du CV
- Langue: Français

Réponds uniquement avec le CV adapté, sans explication.`
      : `You are an expert recruiter and CV writer.

Here is the candidate's CV:
${cvText}

Here is the job offer:
${offerText}

Adapt the CV to maximize selection chances:
- Reorder skills to highlight those required in the offer
- Rephrase experiences to align with the offer's keywords
- Keep ALL true information, never invent anything
- Maintain professional CV structure
- Language: English

Respond only with the adapted CV, no explanation.`

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 3000,
    temperature: 0.3,
  })

  return response.choices[0]?.message?.content ?? ''
}
