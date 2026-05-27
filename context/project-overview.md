## Overview

JobPilot is a bilingual (FR/EN) AI-powered SaaS platform that helps job seekers manage their entire job search in one place. Users paste a job offer and JobPilot automatically adapts their CV to match the offer, generates a personalized cover letter in the correct language, prepares them for interviews with targeted questions, and tracks all their applications in a Kanban board.

## Goals

1. Reduce the time spent per job application from 2 hours to under 15 minutes
2. Help users track all applications in one organized dashboard
3. Prepare users for interviews with AI-generated questions based on the actual offer
4. Generate revenue via Stripe subscriptions (Free + Pro tiers)

## Core User Flow

1. User signs up via Clerk (email or Google/GitHub OAuth)
2. User uploads their CV once (PDF) — stored in their profile
3. User pastes a job offer URL or raw text
4. JobPilot auto-detects the language (FR or EN)
5. JobPilot creates a new application card in the Kanban tracker
6. User can generate: adapted CV, cover letter, interview questions
7. User tracks application status: Applied → Phone → Technical → Offer → Rejected
8. User upgrades to Pro via Stripe when they hit the free tier limits

## Features

### Job Tracker

- Kanban board with 5 columns: Applied / Phone Screen / Technical / Offer / Rejected
- Each card: company, role, date, salary, link, notes, contact
- Auto-parse company + role from pasted offer
- Dashboard stats: response rate, avg time per stage, total applications

### Resume Adapter

- Upload CV once as PDF — stored in user profile
- Paste job offer → AI rewrites CV to match keywords and requirements
- Language auto-detected (FR/EN)
- Export adapted CV as PDF
- Adapted CV linked to the application card

### Cover Letter Generator

- Based on job offer + stored CV
- Language auto-detected (FR/EN)
- Personalized to the user's background, not generic
- Saved to the application card
- Export as PDF

### Interview Prep

- 10 questions generated per offer: technical + behavioral
- STAR-format answer suggestions based on user's CV
- Mock interview mode: timer + user types answer + AI gives feedback
- Question history saved per application

## Pricing

### Free Tier

- 5 tracked applications
- 3 CV adaptations/month
- 3 cover letters/month
- 5 interview questions per offer

### Pro — $9/month

- Unlimited applications
- Unlimited CV adaptations
- Unlimited cover letters (FR + EN)
- Full interview prep + mock mode
- PDF exports
- Analytics dashboard

## Scope

### In Scope

- Auth (Clerk)
- Job Tracker (Kanban)
- Resume Adapter (AI)
- Cover Letter Generator (AI)
- Interview Prep (AI)
- Stripe subscription (Free + Pro)
- Bilingual FR/EN throughout
- PDF export

### Out of Scope (Phase 1)

- Mobile app
- Team/agency plan
- Email reminders
- LinkedIn integration
- Browser extension

## Success Criteria

1. A signed-in user can create an application and move it through the Kanban
2. A user can upload a CV and generate an adapted version from a job offer
3. A cover letter is generated in the correct language automatically
4. Interview questions are generated and saved per application
5. Free tier limits are enforced and Stripe checkout works for Pro upgrade
