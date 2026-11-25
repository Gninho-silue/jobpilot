# Anonymised real-world case (2026-11-26): 3-page CV

Anonymised copy of a real 3-page CV, the adapted CV and the cover letter
generated from it. Every personal detail is replaced (name, contact details,
city, employers, schools, project names and URLs, certifications, target
company) and the identifying figures are changed consistently. The real PDFs
stay on the owner's machine in `test/fixtures/real-2026-11-26/` (git-ignored).

- `original-cv.pages.txt`: the CV, one line per line of the real PDF, pages
  separated by `=== PAGE ===`. Entry titles wrap onto a second line that holds
  the date, as in the real layout.
- `original-cv.pdf`: built from it by `make-original-cv.mjs` (3 pages,
  "Name / Page X of 3" at the bottom of every page, link annotations on the
  labels). Regenerate with `node test/fixtures/anonymized-2026-11-26/make-original-cv.mjs`.
- `adapted-cv.llm.txt`: the adapted CV in the model's format, with the
  production faults: cut at `>DE` (education and certifications lost), the
  HireLoop stack line removed, "Java 21 · Spring Boot 4" removed from Banking.
- `cover-letter.txt`: the letter body, with "for enterprise clients" (not in the
  CV) and "98% line coverage" without "on the service layer".

Used by `test/anonymized/multipage-2026-11-26.test.ts`.
