import { describe, expect, it } from 'vitest'
import { checkCoverLetter } from './check-cover-letter'
import { describeLetterIssues } from './corrections'

// A CV that has continuous integration and nothing about deployment.
const CV = [
  'Jane Doe',
  'Backend Developer',
  'Experience',
  'Platform Engineer, Acme Corp 2022 – 2024',
  '- Set up CI with GitHub Actions across 7 services.',
  '- Built REST services with Node.js.',
].join('\n')

describe('point 5: CI never becomes continuous deployment', () => {
  it.each([
    ['EN', 'At Acme Corp, I set up continuous deployment for 7 services with GitHub Actions.', 'continuous deployment'],
    ['EN', 'At Acme Corp, I built a continuous delivery pipeline for 7 services.', 'continuous delivery'],
    ['EN', 'At Acme Corp, I owned the CD pipeline of 7 services.', 'CD'],
    ['FR', "Chez Acme Corp, j'ai mis en place le déploiement continu de sept services avec GitHub Actions.", 'déploiement continu'],
    ['FR', "Chez Acme Corp, j'ai assuré la livraison continue de sept services.", 'livraison continue'],
  ])('%s: "%s" is flagged as rewording the CV', (_language, letter, phrase) => {
    const issues = checkCoverLetter(CV, letter)
    expect(issues).toEqual([expect.objectContaining({ kind: 'reworded', unsupported: [phrase], expected: 'continuous integration (CI)' })])
  })

  it.each([
    ['EN', 'At Acme Corp, I set up CI with GitHub Actions across 7 services.'],
    ['EN', 'At Acme Corp, I set up continuous integration for 7 services with GitHub Actions.'],
    ['FR', "Chez Acme Corp, j'ai mis en place l'intégration continue de sept services avec GitHub Actions."],
  ])('%s: the CV wording is fine: "%s"', (_language, letter) => {
    expect(checkCoverLetter(CV, letter)).toEqual([])
  })

  it('not flagged when the CV itself mentions continuous deployment', () => {
    const cv = CV.replace('Set up CI', 'Set up CI and continuous deployment')
    expect(checkCoverLetter(cv, 'At Acme Corp, I set up continuous deployment for 7 services.')).toEqual([])
  })

  it('the correction asks for the wording of the CV', () => {
    const issues = checkCoverLetter(CV, 'At Acme Corp, I set up continuous deployment for 7 services.')
    expect(describeLetterIssues(issues)).toEqual([
      'The CV says continuous integration (CI), not "continuous deployment": "At Acme Corp, I set up continuous deployment for 7 services."',
    ])
  })
})
