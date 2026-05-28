'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { InterviewQuestion } from '@/lib/ai/generate-interview-questions'

interface MockInterviewModalProps {
  company: string
  questions: InterviewQuestion[]
  onClose: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function MockInterviewModal({ company, questions, onClose }: MockInterviewModalProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''))
  const [hintOpen, setHintOpen] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function handleFinish() {
    if (timerRef.current) clearInterval(timerRef.current)
    setFinalTime(elapsed)
    setFinished(true)
  }

  function handleAnswerChange(value: string) {
    setAnswers(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function goNext() {
    setHintOpen(false)
    setIndex(i => i + 1)
  }

  function goPrev() {
    setHintOpen(false)
    setIndex(i => i - 1)
  }

  const current = questions[index]!
  const isFirst = index === 0
  const isLast = index === questions.length - 1

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
            value={answers[index] ?? ''}
            onChange={e => handleAnswerChange(e.target.value)}
            className="resize-none min-h-[200px] bg-[hsl(var(--bg-surface-raised))] border border-[hsl(var(--border-default))] text-[hsl(var(--text-primary))] placeholder:text-[hsl(var(--text-muted))] rounded-lg focus-visible:ring-1 focus-visible:ring-amber-500/60 focus-visible:border-[hsl(var(--border-default))]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-[hsl(var(--border-default))]">
        <Button
          variant="ghost"
          onClick={goPrev}
          disabled={isFirst}
          className="rounded-lg border border-[hsl(var(--border-default))] h-9 px-4 text-sm text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--bg-surface-raised))] disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        {isLast ? (
          <Button
            onClick={handleFinish}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-9 px-6 text-sm"
          >
            Finish
          </Button>
        ) : (
          <Button
            onClick={goNext}
            className="rounded-lg bg-amber-500 text-black hover:bg-amber-400 font-medium h-9 px-4 text-sm"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
