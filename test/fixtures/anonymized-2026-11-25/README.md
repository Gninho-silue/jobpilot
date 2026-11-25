# Anonymised real-world case (2026-11-25)

Text of three real PDFs (an original CV, the CV adapted by JobPilot, the cover
letter generated from it), with every personal detail replaced: name, contact
details, city, employer, schools, project names and URLs, target company, and
the dates, figures and certifications that could identify the person. The
values were changed consistently across the three files.

The real PDFs stay on the owner's machine in `test/fixtures/real-*/`
(git-ignored); tests that read them are skipped when the folder is absent (CI).

`adapted-cv.llm.txt` is the same adapted CV in the format the model returns (`>TITLE:`, `>COMPANY:`, `>DATE:` ...), which is what the fact-checker reads; `adapted-cv.txt` is the text of the rendered PDF.

`original-cv.txt` is the text as `extractPdfText` returns it for a LaTeX CV:
accents come out detached from their letter (`Zo´e`, `Compl\`ete`).

## Faulty passages kept on purpose

Adapted CV (`adapted-cv.txt`), fact-check cases:
- "Applied CI/CD pipelines with Docker and GitHub Actions" added to the PFE
  (not in that experience in the original)
- "Integrated backend services with PostgreSQL and Redis" added to the internship
- Title changed to "Digital Transformation Consultant" (original: "AI Software Engineer")
- "Integrated payment processing with Stripe" presents a test-mode integration as real payments

Cover letter (`cover-letter.txt`):
- "I have closely followed Contoso Consulting’ commitment…": a claim about the
  candidate that is not in the CV
- Merges two experiences: the internship workflow and KPI dashboard
  (June – September 2025) are attributed to the final year (PFE, 2026)

Rendering faults (both documents):
- Hyphens dropped: "e commerce", "end to end", "five state", "real time"
- `/` inserted before `%` and digits: "95/%", "Odoo/17"
- Accents lost or detached: "Zoe Martin-Ferre", "ZO´E MARTIN-FERR´E"
- Empty project links: "GitHub —"; header links (LinkedIn, GitHub, Portfolio) lost
- Certification casing changed: "APPLIED MACHINE LEARNING PRACTITIONER CERTIFICATE",
  "PYTHON: FORMATION COMPLÈTE"
