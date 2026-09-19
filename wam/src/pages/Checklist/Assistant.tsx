import { useCallback, useMemo, useRef, useState } from 'react'
import {
  suggestedQuestions,
  type AssistantAnswer,
  type Language,
  type RequirementState,
} from '@tutorial/shared'

import { t } from './strings'

interface Entry {
  role: 'student' | 'assistant'
  text: string
  origin?: AssistantAnswer['origin']
  sources?: AssistantAnswer['sources']
  followUps?: string[]
  /** Whether this question also reached the chat, where ALF replies. */
  askedInChat?: boolean
}

/**
 * The asking half of the panel. The list states rules; this takes the question
 * the rule raises — "do I extend my visa before or after this?", "what if I am
 * missing the transcript?" — and does two things with it: shows the written
 * guidance straight away, and puts the same question into the chat with this
 * student's dates attached, where ALF answers it properly.
 *
 * It is a separate view rather than a drawer under the list: at 420px wide a
 * thread and a ledger cannot share the screen without one of them becoming
 * unreadable.
 */
function Assistant({
  language,
  item,
  ask,
  onBack,
}: {
  language: Language
  /** The row this was opened from, when it was opened from one. */
  item: RequirementState | null
  ask: (input: { question: string; about?: string }) => Promise<AssistantAnswer>
  onBack: () => void
}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const opening = useMemo(
    () => suggestedQuestions(language, item),
    [item, language]
  )

  // Once an answer has come back, its own follow-ups are better than the
  // opening set: they are about what was just said.
  const last = entries[entries.length - 1]
  const suggestions =
    last?.role === 'assistant' && last.followUps?.length
      ? last.followUps
      : entries.length === 0
        ? opening
        : []

  const send = useCallback(
    async (text: string) => {
      const asked = text.trim()
      if (!asked || pending) return

      setEntries((prev) => [...prev, { role: 'student', text: asked }])
      setQuestion('')
      setPending(true)
      setFailed(false)

      try {
        const answer = await ask({ question: asked, about: item?.id })
        setEntries((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: answer.answer,
            origin: answer.origin,
            sources: answer.sources,
            followUps: answer.followUps,
            askedInChat: answer.askedInChat,
          },
        ])
      } catch {
        setFailed(true)
      } finally {
        setPending(false)
        // The answer is long and the newest turn is the one being read.
        window.requestAnimationFrame(() => {
          const thread = threadRef.current
          if (thread) thread.scrollTop = thread.scrollHeight
        })
      }
    },
    [ask, item, pending]
  )

  return (
    <div className="cl cl-chat">
      <div className="cl-head">
        <div className="cl-title">
          {item ? item.title : t('assistantTitle', language)}
        </div>
        <div className="cl-sub">
          {item
            ? `${item.officialKo} · ${t('assistantLead', language)}`
            : t('assistantLead', language)}
        </div>
      </div>

      <div
        className="cl-thread"
        ref={threadRef}
      >
        {entries.length === 0 && (
          <div className="cl-note">{t('assistantEmpty', language)}</div>
        )}

        {entries.map((entry, index) => (
          <div
            className="cl-turn"
            data-role={entry.role}
            key={`${entry.role}-${index}`}
          >
            <div className="cl-turn-who">
              {entry.role === 'student'
                ? t('you', language)
                : t('assistantName', language)}
            </div>
            <div className="cl-turn-text">{entry.text}</div>
            {entry.role === 'assistant' && (
              <>
                {entry.sources && entry.sources.length > 0 && (
                  <div className="cl-actions">
                    {entry.sources.map((source) => (
                      <a
                        className="cl-link"
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label}
                      </a>
                    ))}
                  </div>
                )}
                {/*
                 * Where the words came from, and whether ALF has the question
                 * too. An answer with no provenance is the thing a student
                 * cannot check, and checking is the whole point here.
                 */}
                <div className="cl-note">
                  {[
                    entry.origin === 'guide' ? t('originGuide', language) : '',
                    t(
                      entry.askedInChat ? 'alfAnswering' : 'alfUnreachable',
                      language
                    ),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </div>
              </>
            )}
          </div>
        ))}

        {pending && <div className="cl-note">{t('thinking', language)}</div>}
        {failed && (
          <div className="cl-penalty">{t('assistantFailed', language)}</div>
        )}
      </div>

      <div className="cl-foot">
        {!pending && suggestions.length > 0 && (
          <div className="cl-filters">
            {suggestions.slice(0, 3).map((suggestion) => (
              <button
                type="button"
                className="cl-chip"
                key={suggestion}
                onClick={() => void send(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <form
          className="cl-compose"
          onSubmit={(event) => {
            event.preventDefault()
            void send(question)
          }}
        >
          <input
            className="cl-input"
            value={question}
            placeholder={t('assistantPlaceholder', language)}
            onChange={(event) => setQuestion(event.target.value)}
            aria-label={t('assistantTitle', language)}
          />
          <button
            type="submit"
            className="cl-send"
            disabled={pending || question.trim().length === 0}
          >
            {t('send', language)}
          </button>
        </form>

        <button
          type="button"
          className="cl-quiet"
          onClick={onBack}
        >
          {t('backToList', language)}
        </button>
      </div>
    </div>
  )
}

export default Assistant
