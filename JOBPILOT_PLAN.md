# JOBPILOT_PLAN.md — Tester, sécuriser, rendre la démo accessible, refaire le design

> Brief pour Claude Code. Lis-le en entier. Une étape à la fois, dans l'ordre.
> Fin d'étape : tests verts + lint + typecheck + build → commit → push → coche ici → résume et stop.

## Contexte (audit du 24/11/2026)

- Next.js 16 (App Router), Clerk, Prisma 7 + Postgres (Supabase), Supabase Storage, Groq (Llama 3.3 70B), Stripe **en mode test**, Zod. Déployé sur Vercel.
- **Aucun test.** La CI fait lint + typecheck + build seulement.
- Points sains : `auth()` sur toutes les routes API, filtre par `userId` sur les ressources, signature Stripe vérifiée (`constructEvent`), upload CV validé (type, 5 Mo, octets magiques `%PDF-`).
- Problèmes trouvés :
  1. `src/lib/rate-limit` est **en mémoire** (`Map`) : sur Vercel (serverless, plusieurs instances, redémarrages), la limite ne protège pratiquement rien.
  2. `POST /api/offers/parse` appelle le LLM (`parseJobOffer`) **sans rate limit ni quota** → n'importe quel compte gratuit peut consommer la clé Groq sans limite. Idem à vérifier pour `cover-letter-pdf` / `adapted-cv-pdf`.
  3. Webhook Stripe **sans idempotence** : Stripe peut renvoyer le même événement ; rien n'empêche un double traitement.
  4. Dashboard : « +50 % vs last month » s'affiche alors qu'il n'y a **aucune donnée le mois précédent** (`lastMonthRate = 0`), et c'est une différence en points, pas en %.
  5. Design « template IA » : JetBrains Mono pour **tout** le texte (`--font-sans` = mono), accroche générique « Land your dream job faster with AI », pastille « AI-Powered », 3 appels « Upgrade » visibles en même temps (bannière, carte latérale, réglages), cartes de stats aux icônes colorées, barre de défilement blanche sur le kanban sombre.
  6. Un recruteur doit créer un compte pour voir quoi que ce soit, et le paiement est en mode test sans que ce soit dit.

## Règles

- Un commit = une étape terminée (code + tests + doc). Conventional Commits en anglais. Push sur `main`.
- **TDD pour tout nouveau code.** Étape 1 = tests de caractérisation de l'existant.
- Les tests n'appellent **jamais** Groq, Stripe, Clerk ou Supabase réels : mocks / faux clients. Base de test : Postgres via Testcontainers (ou `docker compose`) pour les tests d'intégration Prisma.
- Jamais de secrets commités, jamais de `--force`.
- Toute affirmation du README doit être vraie.

---

## Étape 1 — Filet de tests + CI
- [x] Vitest (unit + intégration), Testing Library pour les composants. (Playwright : installé avec l'E2E, Étape 7.)
- [x] Unit : schémas Zod, logique de quotas/plans, calculs du dashboard, construction des prompts, parsing des réponses LLM (JSON invalide, champs manquants).
- [x] Routes API (handlers appelés directement, `auth()` mocké) : 401 sans session ; **404 sur la ressource d'un autre utilisateur** pour chaque route `applications/[id]/*` (IDOR) ; quotas du plan gratuit respectés (5 candidatures, 3 adaptations, 3 lettres) ; upload CV (mauvais type, trop gros, faux PDF).
- [x] Webhook Stripe : signature invalide → 400 ; `checkout.session.completed` → plan Pro ; `customer.subscription.deleted` → retour au plan gratuit.
- [x] CI : ajouter le job de tests (avec Postgres en service) avant le build. Badge dans le README.
- [x] Commit : `test: characterization tests and CI` → push.

## Étape 2 — Sécurité et coûts (TDD)
- [x] **Rate limit distribué** : remplacer la `Map` par un stockage partagé (Postgres via Prisma avec fenêtre glissante, ou Upstash Redis si Gninho crée un compte gratuit). → Postgres, table `RateLimitHit`. Appliqué à **toutes** les routes qui appellent le LLM, y compris `offers/parse`.
- [x] **Quotas vérifiés côté serveur de façon atomique** (transaction : vérifier + incrémenter en une fois), testés avec des requêtes concurrentes (10 requêtes simultanées avec 1 crédit restant → 1 seule réussit).
- [x] **Idempotence du webhook Stripe** : table `ProcessedStripeEvent(id unique)` (nommée `ProcessedBillingEvent`, id préfixé par le fournisseur, puisque le paiement passe par `BillingProvider`) ; un événement rejoué est ignoré. Test.
- [x] **Injection de prompt** : le texte de l'offre et du CV est encadré comme donnée (délimiteurs + consigne système), longueur max ; tests avec une offre contenant « ignore previous instructions… ».
- [x] **Découpler le paiement de Stripe** : interface `BillingProvider` (checkout, portail, webhook → événements internes `subscription.activated` / `subscription.canceled`). Stripe reste l'implémentation actuelle (mode test). Raison : Stripe n'accepte pas les entreprises basées au Maroc ; pour encaisser de vrais paiements, Gninho passera par un Merchant of Record (Lemon Squeezy ou Paddle). Le reste du code ne doit dépendre que de l'interface. Tests sur l'interface avec un faux fournisseur.
- [x] **Remplacer `pdf-parse`** (1.1.1, non maintenu, échoue au hasard sur des PDF valides : « bad XRef entry » environ 1 fois sur 3 en local) par une bibliothèque maintenue et fiable en serverless, par exemple `unpdf`. En TDD avec de vrais PDF de test dans `test/fixtures/` : CV d'une page, CV de deux pages (texte des deux pages extrait), PDF scanné sans texte → erreur 400 (code actuel de la route) avec un message clair (« Ce PDF ne contient pas de texte, il s'agit probablement d'un scan »). Puis retirer le faux parser (`require.cache`) des tests d'upload pour qu'ils utilisent la vraie bibliothèque.
- [x] Commit : `fix(security): distributed rate limiting, atomic quotas, idempotent webhooks` → push.

## Étape 3 — CV adapté sans invention (TDD, fonctionnalité phare)
Problème : un LLM qui « adapte » un CV peut ajouter des compétences, entreprises, dates ou chiffres absents du CV d'origine. Pour un candidat, c'est grave (CV mensonger).
- [x] Extraire du CV d'origine les **faits** : entreprises, intitulés, dates, établissements, chiffres, compétences.
- [x] **Vérificateur déterministe** sur le CV adapté : toute entreprise / date / chiffre / diplôme absent du CV d'origine est signalé ; toute compétence absente est signalée (tolérance pour reformulations listées, ex. « React.js » = « React »).
- [x] Si problème : 1 régénération avec la liste des erreurs, puis affichage clair à l'utilisateur des éléments non vérifiés **avant** l'export PDF (il peut les retirer en un clic).
- [x] Même principe, plus léger, pour la lettre de motivation (pas d'expérience inventée).
- [x] Tests avec faux LLM : CV correct, compétence inventée, entreprise inventée, chiffre gonflé.
- [x] **Cas réel (25/11/2026)**, fixtures anonymisées dans `test/fixtures/anonymized-2026-11-25/` (vrais PDF en local dans `test/fixtures/real-*/`, ignorés par git, tests sautés en CI) :
  - CV adapté : le vérificateur signale « CI/CD with Docker and GitHub Actions » ajouté au PFE, « PostgreSQL and Redis » ajouté au stage, et le titre changé en « Digital Transformation Consultant ». Le titre reste celui du CV d'origine, sauf variante explicitement validée par l'utilisateur. Stripe ne doit pas être présenté comme un vrai paiement.
  - Lettre : pas de fusion de deux expériences (date et entreprise de chaque fait vérifiées), pas d'affirmation sur le candidat absente du CV (« I have closely followed… »).
- [x] **Bugs de rendu PDF (TDD)**, causes trouvées :
  - le modèle écrit `‑` (U+2011) et une espace fine insécable (U+202F) que Helvetica n'a pas : tiret rendu comme un espace, U+202F rendu comme `/` (« 100/% », « Odoo/17 ») → normaliser la typographie avant rendu et retirer des prompts les contre-exemples « 100/% » ;
  - accents détachés à l'extraction d'un CV LaTeX (« Silu´e ») et accents combinants perdus → recomposer à l'extraction et au rendu ; `stripNonPrintable` de la lettre supprime aussi `´` et `·` ;
  - en-tête de la lettre : la 2e ligne du CV (le titre) est prise pour le contact ;
  - liens : URLs absentes du texte extrait (seuls les libellés « LinkedIn | GitHub | Portfolio ») → lire les annotations de lien du PDF à l'upload ; lien de projet rendu « GitHub ↗ » quelle que soit la valeur (« GitHub — ») ;
  - casse des certifications : `isSectionHeader` met la ligne en majuscules avant de tester si elle est en majuscules, donc toute ligne courte devient un titre de section.
  - Tests avec du texte contenant `-`, `%`, `é`, `&`, `_`.
- [ ] Commit : `feat(ai): fact-check adapted CVs and cover letters against the original CV` → push. (Fait en un commit par bloc à la demande de Gninho : rendu PDF, prompts génériques, extraction des faits, vérificateur, régénération, marquage avant export, lettre. Push après la migration `20261125000000_application_approved_cv_title`.)

## Étape 4 — Démo sans inscription
- [x] Bouton **« Try the demo »** sur la page d'accueil : ouvre un espace de démonstration avec un **CV fictif** (personnage inventé, aucune donnée réelle) et 4–5 candidatures fictives à différents stades, sans créer de compte.
- [x] Données de démo isolées par visiteur (identifiant aléatoire en cookie), en lecture/écriture, **réinitialisées toutes les 24 h** ; quotas IA de démo stricts (ex. 3 générations par visiteur et par jour) pour protéger la clé Groq.
- [x] Bandeau permanent en mode démo : « Demo workspace — data resets daily. Payments run in Stripe test mode (card 4242 4242 4242 4242). »
- [x] Le bouton « Upgrade » en démo ouvre Stripe Checkout en mode test (ça montre l'intégration) ; aucune vraie transaction possible.
- [x] Tests : isolation entre visiteurs de démo, réinitialisation, quotas.
- [ ] Commit : `feat(demo): no-signup demo workspace with seeded fictional data` → push. (Fait en une série de commits `feat(demo)` ; push après la migration et les variables Vercel.)

## Étape 4.5 — Corrections préalables (avant l'étape 5)
- [x] **Test E2E instable** : le test « Use » à 1175 px a expiré une fois. Trouver la cause (élément qui apparaît après une animation ? requête non attendue ?), corriger la cause et pas le timeout, puis lancer le test 10 fois de suite pour le prouver.
- [x] **`NEXT_PUBLIC_APP_URL`** valait `http://localhost:3000` en production (corrigé à la main dans Vercel le 25/11) : redirections Stripe, `metadataBase` et sitemap pointaient vers localhost. Dans `src/lib/env.ts`, faire échouer le build en production (`VERCEL_ENV=production`) si la variable est absente, en `http://` ou contient `localhost`. Ajouter au test de fumée une vérification que le sitemap et les métadonnées pointent vers `https://jobpilot-jet.vercel.app`.
- [x] Commits séparés, push sur `main` (CI verte).

## Étape 5 — Corrections de données affichées (TDD)
Cas réels vus dans la démo le 25/11 :
- [x] « Free plan — 0 of 5 applications used this month » alors que l'espace contient 5 candidatures : le compteur doit refléter la réalité (ou expliquer clairement ce qu'il compte).
- [x] « -20 % vs last month » affiché avec une **flèche vers le haut** : la flèche suit le signe ; variation en **points** (« −20 pts ») ; « — » s'il n'y a pas de données le mois précédent.
- [x] « Welcome back, there » : pas de nom → « Welcome back » tout court (et un prénom fictif pour la démo).
- [x] Vérifier chaque chiffre du dashboard contre la base (tests), y compris pour un espace de démo.
- [x] Commit : `fix(dashboard): honest trend indicators` → push sur `main`.

## Étape 6 — Refonte de toute l'application (skills frontend-design, humanizer, webapp-testing)
**Sur une branche `redesign`. Aucun push sur `main` avant validation de Gninho sur la preview Vercel.**

### 6.1 Inventaire (sans toucher au code)
- [ ] Avec la démo (pas besoin de Clerk), captures **avant** de chaque écran à 1440 et 390 px, thèmes sombre et clair : accueil, connexion et inscription, dashboard, Applications (kanban + panneau de détail : Overview, Resume, Cover Letter, Interview), My CV, Interview Prep, entretien simulé, Settings, modales (nouvelle candidature, upgrade, confirmations), bandeau de démo, états vides, chargement, erreur.

### 6.2 Direction visuelle — **STOP : attendre la validation de Gninho**
- [ ] Une page de proposition : typographie, palette, espacements, composants, et **la solution mobile** (voir 6.4), avec 2 écrans maquettés (dashboard desktop + dashboard mobile 390 px).
- [ ] Ne rien coder avant la validation.

### 6.3 Contraintes générales
- Police sans-serif pour le texte (Geist Sans ou Inter) ; JetBrains Mono seulement pour les chiffres, le code et les badges techniques. Supprimer `--font-sans: "JetBrains Mono"`.
- Accueil : remplacer « Land your dream job faster with AI » et la pastille « AI-Powered » par une promesse concrète (ex. « Tailor your CV to every job offer, without inventing anything. ») ; vraies captures de l'application ; bouton principal « Try the demo ».
- **Un seul appel « Upgrade » visible à la fois.**
- Ambre réservé aux actions principales ; cartes de stats neutres (icônes monochromes) ; barres de défilement sombres.
- Accessibilité AA (contraste, focus clavier, `aria-label` sur tous les boutons-icônes), `prefers-reduced-motion`, thème clair vérifié.
- Textes : passe humanizer FR et EN, sans changer aucun fait.
- Les PDF exportés (CV et lettre) ne changent pas.
- Aucune régression des tests E2E existants (panneau aux trois largeurs, démo).

### 6.4 Mobile en priorité
Capture du téléphone de Gninho à 390 px le 25/11 : la barre latérale prend la moitié de l'écran, cartes de stats écrasées avec les icônes par-dessus le texte, « New Application » coupé, bandeau de démo sur 9 lignes.
- Sous 768 px : barre latérale → **menu repliable (hamburger) ou barre de navigation en bas** (proposer la meilleure option dans 6.2).
- Cartes de stats sur 2 colonnes lisibles ou en liste ; icônes jamais par-dessus le texte.
- Kanban : une colonne à la fois avec glissement horizontal, ou vue liste par statut.
- Panneau de détail en **plein écran** sur mobile.
- Bandeau de démo sur **une ligne courte** (« Demo · resets daily · card 4242… »), dépliable.
- Aucun défilement horizontal de la page, à aucune largeur.
- **Test E2E** : parcours complet de la démo à 390 px (dashboard, kanban, panneau, My CV, entretien) qui vérifie qu'aucun élément ne déborde de l'écran.

### 6.5 Mise en œuvre (après validation)
- [ ] Un commit par zone : système de design et tokens, mise en page générale + mobile, dashboard, kanban et panneau, My CV, entretien, Settings et modales, accueil. Captures **après** à chaque fois.
- [ ] Push de la branche `redesign` → donner l'URL de preview Vercel à Gninho. Merge dans `main` seulement après sa validation.

## Étape 7 — E2E et vérification en production
- [ ] Playwright : parcours démo complet (ouvrir la démo → créer une candidature depuis une offre → adapter le CV → voir la vérification → générer la lettre → entraînement d'entretien → export PDF).
- [ ] Parcours connecté avec Clerk en mode test (testing tokens), si faisable sans secrets dans le repo.
- [ ] Test de fumée après chaque déploiement Vercel (page d'accueil, démo, API santé).
- [ ] Commit : `test(e2e): demo flow and production smoke test` → push.

## Étape 8 — README et résumé
- [ ] README : lien démo, captures, architecture (Mermaid), section « How JobPilot avoids inventing experience », sécurité (quotas, rate limit, webhooks idempotents), tests et CI, Stripe en mode test.
- [ ] Résumé final pour Gninho : fonctionnalités, nombre de tests, textes à mettre à jour (portfolio, LinkedIn, README de profil GitHub).
