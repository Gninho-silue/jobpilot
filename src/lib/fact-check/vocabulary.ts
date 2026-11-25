/**
 * Technologies the fact-checker recognises, with the rewordings it accepts as
 * the same thing ("React.js" = "React"). Deliberately conservative: a word that
 * is not listed is never flagged, so an unusual tool cannot cause a false alarm.
 *
 * `exactCase`: names that are also ordinary words ("Express", "Render") only
 * count when written with their capital letter.
 */
export interface Technology {
  name: string
  aliases?: string[]
  exactCase?: boolean
}

export const TECHNOLOGIES: Technology[] = [
  // Languages
  { name: 'Python' }, { name: 'JavaScript', aliases: ['JS'] }, { name: 'TypeScript', aliases: ['TS'] },
  { name: 'Java' }, { name: 'Kotlin' }, { name: 'Scala' }, { name: 'C#' }, { name: 'C++' },
  { name: 'Golang' }, { name: 'Rust', exactCase: true }, { name: 'Ruby', exactCase: true }, { name: 'PHP' },
  { name: 'Swift', exactCase: true }, { name: 'Dart' }, { name: 'SQL' }, { name: 'Bash' },
  { name: 'HTML' }, { name: 'CSS' }, { name: 'SCSS', aliases: ['Sass'] }, { name: 'GraphQL' },
  // Frontend / mobile
  { name: 'React', aliases: ['React.js', 'ReactJS'] }, { name: 'React Native' }, { name: 'Next.js', aliases: ['NextJS'] },
  { name: 'Vue', aliases: ['Vue.js', 'VueJS'], exactCase: true }, { name: 'Nuxt', aliases: ['Nuxt.js'] },
  { name: 'Angular', exactCase: true }, { name: 'Svelte' }, { name: 'Tailwind', aliases: ['Tailwind CSS', 'TailwindCSS'] },
  { name: 'Redux' }, { name: 'Flutter' }, { name: 'iOS' }, { name: 'Android' }, { name: 'QWeb' },
  // Backend / frameworks
  { name: 'Node.js', aliases: ['NodeJS'] }, { name: 'Express', aliases: ['Express.js', 'ExpressJS'], exactCase: true },
  { name: 'NestJS' }, { name: 'FastAPI' }, { name: 'Django' }, { name: 'Flask', exactCase: true },
  { name: 'Spring Boot' }, { name: 'Spring', exactCase: true }, { name: 'Laravel' }, { name: 'Rails', aliases: ['Ruby on Rails'], exactCase: true },
  { name: '.NET', aliases: ['dotnet', 'ASP.NET'] }, { name: 'Odoo' }, { name: 'Prisma' },
  // Data
  { name: 'PostgreSQL', aliases: ['Postgres'] }, { name: 'MySQL' }, { name: 'MariaDB' }, { name: 'SQLite' },
  { name: 'MongoDB', aliases: ['Mongo'] }, { name: 'Redis' }, { name: 'Elasticsearch' }, { name: 'Kafka' },
  { name: 'RabbitMQ' }, { name: 'Spark', aliases: ['Apache Spark'], exactCase: true }, { name: 'Pandas' },
  { name: 'NumPy' }, { name: 'ChromaDB', aliases: ['Chroma'] }, { name: 'Pinecone' }, { name: 'Supabase' },
  { name: 'Firebase' }, { name: 'DynamoDB' },
  // AI / ML
  { name: 'LangGraph' }, { name: 'LangChain' }, { name: 'LlamaIndex' }, { name: 'RAG' }, { name: 'Ollama' },
  { name: 'HuggingFace', aliases: ['Hugging Face'] }, { name: 'PyTorch' }, { name: 'TensorFlow' },
  { name: 'scikit-learn', aliases: ['sklearn'] }, { name: 'OpenAI' }, { name: 'Groq', aliases: ['Groq API', 'Groq AI'] },
  // Cloud / DevOps
  { name: 'Docker' }, { name: 'Kubernetes', aliases: ['K8s'] }, { name: 'Terraform' }, { name: 'Ansible' },
  { name: 'AWS' }, { name: 'Azure' }, { name: 'GCP', aliases: ['Google Cloud'] }, { name: 'Vercel' },
  { name: 'Render', exactCase: true }, { name: 'Netlify' }, { name: 'Heroku' }, { name: 'GitHub Actions' },
  { name: 'GitLab CI' }, { name: 'Jenkins' }, { name: 'CI/CD' }, { name: 'Nginx' }, { name: 'Linux' },
  { name: 'Git', exactCase: true },
  // Services / tools
  { name: 'Stripe' }, { name: 'Clerk', exactCase: true }, { name: 'Twilio' }, { name: 'Jest' }, { name: 'Vitest' },
  { name: 'Cypress' }, { name: 'Playwright' }, { name: 'Selenium' }, { name: 'Figma' }, { name: 'Jira' },
]

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
}

/** One regex per alias, longest first ("Spring Boot" before "Spring"). */
export const TERM_PATTERNS: Array<{ name: string; pattern: RegExp }> = TECHNOLOGIES.flatMap(tech =>
  [tech.name, ...(tech.aliases ?? [])].map(alias => ({
    name: tech.name,
    // Not inside another word: "SQL" is not in "PostgreSQL", "Java" not in "JavaScript".
    pattern: new RegExp(`(?<![\\p{L}\\p{N}_.+#-])${escape(alias)}(?![\\p{L}\\p{N}_+#])`, tech.exactCase ? 'gu' : 'giu'),
  }))
).sort((a, b) => b.pattern.source.length - a.pattern.source.length)
