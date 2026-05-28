import { track } from '@vercel/analytics'

export const trackEvent = {
  applicationCreated: (language: string) =>
    track('application_created', { language }),
  cvAdapted: () =>
    track('cv_adapted'),
  coverLetterGenerated: () =>
    track('cover_letter_generated'),
  interviewStarted: () =>
    track('mock_interview_started'),
  upgradeClicked: (source: string) =>
    track('upgrade_clicked', { source }),
  upgraded: () =>
    track('plan_upgraded'),
}
