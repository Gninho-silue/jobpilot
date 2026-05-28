'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'
import type { InterviewFeedback } from '@/lib/ai/interview-feedback'
import { trackEvent } from '@/lib/analytics'

interface MockInterviewModalProps {
  company: string
  questions: InterviewQuestion[]
  language: 'FR' | 'EN'
  isPro: boolean
  onClose: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function FeedbackCard({
  feedback,
  betterOpen,
  onToggleBetter,
}: {
  feedback: InterviewFeedback
  betterOpen: boolean
  onToggleBetter: () => void
}) {
  const scoreColor =
    feedback.score >= 8
      ? 'text-emerald-400'
      : feedback.score >= 5
      ? 'text-amber-400'
      : 'text-red-400'

  return (
    <div className="rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface-raised))] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[hsl(var(--text-secondary))] uppercase tracking-wide">
          AI Feedback
        </span>
        <span className={`text-sm font-bold ${scoreColor}`}>{feedback.score}/10</span>
      </div>

      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`text-sm ${i < feedback.score ? scoreColor : 'text-[hsl(var(--text-muted))]'}`}
          >
            {i < feedback.score ? '★' : '☆'}
          </span>
        ))}
      </div>

      {feedback.strengths.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-emerald-400">✅ Strengths</p>
          <ul className="space-y-0.5">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-xs text-[hsl(var(--text-secondary))] flex gap-1.5">
                <span className="text-[hsl(var(--text-muted))] shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-amber-400">💡 Improvements</p>
          <ul className="space-y-0.5">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="text-xs text-[hsl(var(--text-secondary))] flex gap-1.5">
                <span className="text-[hsl(var(--text-muted))] shrink-0">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.betterAnswer && (
        <div>
          <button
            type="button"
            onClick={onToggleBetter}
            className="text-xs text-[hsl(var(--text-muted))] hover:text-amber-500 transition-colors"
          >
            🎯 Better Answer {betterOpen ? '▲' : '▼'}
          </button>
          {betterOpen && (
            <p className="mt-2 text-xs text-[hsl(var(--text-secondary))] italic leading-relaxed bg-[hsl(var(--bg-base))] rounded-lg px-3 py-2">
              {feedback.betterAnswer}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export function MockInterviewModal({ company, questions, language, isPro, onClose }: MockInterviewModalProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [hintOpen, setHintOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [feedbacks, setFeedbacks] = useState<Record<number, InterviewFeedback>>({})
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackAttempted, setFeedbackAttempted] = useState<Set<number>>(new Set())
  const [betterAnswerOpen, setBetterAnswerOpen] = useState(false)

  useEffect(() => {
    trackEvent.interviewStarted()
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function handleAnswerChange(value: string) {
    setAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  async function fetchFeedback(questionIndex: number) {
    const answer = answers[questionIndex] ?? ''
    const q = questions[questionIndex]!
    setFeedbackLoading(true)
    setFeedbackAttempted(prev => new Set(prev).add(questionIndex))
    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q.question,
          answer,
          type: q.type,
          language,
        }),
      })
      const json = await res.json() as { data?: InterviewFeedback }
      if (res.ok && json.data) {
        setFeedbacks(prev => ({ ...prev, [questionIndex]: json.data! }))
      }
    } catch {
      // Silently fail — user can proceed on next click
    } finally {
      setFeedbackLoading(false)
    }
  }

  function shouldFetchFeedback(questionIndex: number): boolean {
    const answer = answers[questionIndex] ?? ''
    return (
      isPro &&
      answer.length >= 10 &&
      !feedbacks[questionIndex] &&
      !feedbackAttempted.has(questionIndex) &&
      !feedbackLoading
    )
  }

  async function handleNext() {
    if (shouldFetchFeedback(index)) {
      await fetchFeedback(index)
      return
    }
    setHintOpen(false)
    setBetterAnswerOpen(false)
    setIndex(i => i + 1)
  }

  async function handleFinish() {
    if (shouldFetchFeedback(index)) {
      await fetchFeedback(index)
      return
    }
    if (timerRef.current) clearInterval(timerRef.current)
    setFinalTime(elapsed)
    setFinished(true)
  }

  function goPrev() {
    setHintOpen(false)
    setBetterAnswerOpen(false)
    setIndex(i => i - 1)
  }

  const current = questions[index]!
  const isFirst = index === 0
  const isLast = index === questions.length - 1
  const currentFeedback = feedbacks[index]
  const currentAnswer = answers[index] ?? ''

  if (finished) {
    return (
      <div className="fixed inset-0 z-50 bg-[hsl(var(--bg-base))] flex flex-col overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-6 py-12 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-2xl font-semibold text-[hsl(var(--text-primary))]">Interview complete!</p>
            <p className="text-sm text-[hsl(var(--text-secondary))]">
              Time taken: <span className="text-amber-500 font-medium">{formatTime(finalTime)}</span>
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`rounded-xl border p-4 space-y-2 ${
                  q.type === 'technical'
                    ? 'border-l-2 border-l-sky-500 border-[hsl(var(--border-default))]'
                    : 'border-l-2 border-l-amber-500 border-[hsl(var(--border-default))]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      q.type === 'technical'
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    {q.type === 'technical' ? 'Technical' : 'Behavioral'}
                  </span>
                  <span className="text-xs text-[hsl(var(--text-muted))]">Q{i + 1}</span>
                </div>
                <p className="text-sm font-medium text-[hsl(var(--text-primary))]">{q.question}</p>
                {answers[i] ? (
                  <p className="text-xs text-[hsl(var(--text-secondary))] whitespace-pre-wrap leading-relaxed">
                    {answers[i]}
                  </p>
                ) : (
                  <p className="text-xs text-[hsl(var(--text-muted))] italic">No answer provided</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium px-8"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--bg-base))] flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border-default))]">
        <div>
          <p className="text-sm font-semibold text-[hsl(var(--text-primary))]">
            Mock Interview — {company}
          </p>
          <p className="text-xs text-[hsl(var(--text-muted))]">
            Question {index + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-amber-500">{formatTime(elapsed)}</span>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-raised))] hover:text-[hsl(var(--text-secondary))] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[hsl(var(--bg-surface-raised))]">
        <div
          className="h-full bg-amber-500 transition-all"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="space-y-3">
            <span
              className={`inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full ${
                current.type === 'technical'
                  ? 'bg-sky-500/10 text-sky-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {current.type === 'technical' ? 'Technical' : 'Behavioral'}
            </span>
            <p className="text-lg font-semibold text-[hsl(var(--text-primary))] leading-snug">
              {current.question}
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setHintOpen(h => !h)}
              className="text-xs text-[hsl(var(--text-muted))] hover:text-amber-500 transition-colors"
            >
              {hintOpen ? 'Hide hint ▲' : 'Show hint ▼'}
            </button>
            {hintOpen && (
              <p className="mt-2 text-xs text-[hsl(var(--text-secondary))] italic leading-relaxed bg-[hsl(var(--bg-surface-raised))] rounded-lg px-3 py-2">
                {current.hint}
              </p>
            )}
          </div>

          <Textarea
            placeholder="Type your answer here..."
            value={currentAnswer}
            onChange={e => handleAnswerChange(e.target.value)}
            className="resize-none min-h-[200px] bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))]"
          />

          {/* Feedback area */}
          {!isPro && currentAnswer.length >= 10 && (
            <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-xs text-[hsl(var(--text-secondary))]">
                Upgrade to Pro for AI feedback on your answers
              </p>
              <a
                href="/settings"
                className="text-xs font-medium text-amber-500 hover:text-amber-400 transition-colors shrink-0 ml-3"
              >
                Upgrade →
              </a>
            </div>
          )}

          {isPro && feedbackLoading && (
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-muted))] py-2">
              <span className="h-3.5 w-3.5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin inline-block" />
              Getting AI feedback...
            </div>
          )}

          {isPro && currentFeedback && !feedbackLoading && (
            <FeedbackCard
              feedback={currentFeedback}
              betterOpen={betterAnswerOpen}
              onToggleBetter={() => setBetterAnswerOpen(o => !o)}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border-default))]">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={isFirst || feedbackLoading}
          className="rounded-lg border border-[hsl(var(--border-default))] h-9 px-4 text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {isLast ? (
          <Button
            onClick={() => void handleFinish()}
            disabled={feedbackLoading}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-9 px-6 text-sm disabled:opacity-60"
          >
            {feedbackLoading ? 'Getting feedback...' : 'Finish'}
          </Button>
        ) : (
          <Button
            onClick={() => void handleNext()}
            disabled={feedbackLoading}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-9 px-4 text-sm disabled:opacity-60"
          >
            {feedbackLoading ? (
              'Getting feedback...'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
