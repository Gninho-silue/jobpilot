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

describe('point 7: hollow phrases are warnings', () => {
  it.each([
    ['EN', 'My experience aligns perfectly with your needs.', 'aligns perfectly'],
    ['EN', 'Your role perfectly aligns with my goals.', 'perfectly aligns'],
    ['EN', 'I am eager to work on high-profile projects.', 'high-profile'],
    ['EN', 'I bring a strong work ethic to every team.', 'strong work ethic'],
    ['EN', 'I have a proven ability to deliver.', 'proven ability'],
    ['EN', 'I have a proven track record of delivery.', 'proven track record'],
    ['EN', 'My expertise in Node.js and generative AI will help your team.', 'expertise'],
    ['FR', 'Mon profil correspond parfaitement à vos besoins.', 'correspond parfaitement'],
    ['FR', "Mon parcours s'aligne parfaitement avec vos attentes.", 'aligne parfaitement'],
    ['FR', 'Je souhaite contribuer à des projets de premier plan.', 'de premier plan'],
    ['FR', "J'ai une forte éthique de travail.", 'éthique de travail'],
    ['FR', "J'ai une capacité avérée à livrer.", 'capacité avérée'],
    ['FR', 'Mon expertise en Node.js et en IA générative sera utile.', 'expertise'],
  ])('%s: "%s"', (_language, letter, phrase) => {
    expect(checkCoverLetter(CV, letter)).toEqual([expect.objectContaining({ kind: 'hollow', unsupported: [phrase] })])
  })

  it('"expertise" is fine when the CV claims it', () => {
    const cv = CV.replace('Backend Developer', 'Backend Developer with expertise in Node.js')
    expect(checkCoverLetter(cv, 'My expertise in Node.js fits your team.')).toEqual([])
  })

  it('a fact-based sentence has no warning', () => {
    expect(checkCoverLetter(CV, "J'ai démontré ma capacité à livrer des services REST avec Node.js chez Acme Corp.")).toEqual([])
  })

  it('a warning is shown, never sent to the regeneration', () => {
    const issues = checkCoverLetter(CV, 'I bring a strong work ethic to every team.')
    expect(issues).toHaveLength(1)
    expect(describeLetterIssues(issues)).toEqual([])
  })
})
