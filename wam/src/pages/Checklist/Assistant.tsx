import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  suggestedQuestions,
  type AssistantAnswer,
  type Language,
  type RequirementState,
} from '@tutorial/shared'
import {
  Box,
  Button,
  Divider,
  HStack,
  Text,
  VStack,
} from '@channel.io/bezier-react/beta'
import { InlineBanner } from '@channel.io/app-sdk-wam-ui'

import './brand.css'
import { t } from './strings'

const INPUT_STYLE = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--bezier-color-border-neutral)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
}

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
 * student's dates attached, where ALF answers it.
 *
 * It takes over the panel rather than sitting under the list: a thread and a
 * ledger in one column means neither is readable.
 */
function Assistant({
  language,
  item,
  ask,
  onBack,
  preset,
}: {
  language: Language
  /** The row this was opened from, when it was opened from one. */
  item: RequirementState | null
  ask: (input: { question: string; about?: string }) => Promise<AssistantAnswer>
  onBack: () => void
  /** A question the student picked from a row, asked on open. */
  preset?: string
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
          if (thread) thread.scrollIntoView({ block: 'end' })
        })
      }
    },
    [ask, item, pending]
  )

  const asked = useRef(false)
  useEffect(() => {
    // The question the student picked from a row is asked on open, so the
    // chip behaves like a question and not like a text-field prefill.
    if (preset && !asked.current) {
      asked.current = true
      void send(preset)
    }
  }, [preset, send])

  return (
    <VStack
      className="skku"
      spacing={12}
    >
      <VStack spacing={4}>
        <Text
          typo="18"
          bold
          color="text-neutral"
        >
          {item ? item.title : t('assistantTitle', language)}
        </Text>
        <Text
          typo="12"
          color="text-neutral-lighter"
        >
          {item
            ? `${item.officialKo} · ${t('assistantLead', language)}`
            : t('assistantLead', language)}
        </Text>
      </VStack>

      <VStack
        spacing={10}
        ref={threadRef}
      >
        {entries.length === 0 && (
          <Text
            typo="13"
            color="text-neutral-lighter"
          >
            {t('assistantEmpty', language)}
          </Text>
        )}

        {entries.map((entry, index) =>
          entry.role === 'student' ? (
            <VStack
              key={`you-${index}`}
              spacing={2}
            >
              <Text
                typo="11"
                bold
                color="text-accent-blue"
              >
                {t('you', language)}
              </Text>
              <Text
                typo="13"
                color="text-neutral"
              >
                {entry.text}
              </Text>
            </VStack>
          ) : (
            <Box
              key={`answer-${index}`}
              padding={12}
              borderRadius="8"
              borderWidth={1}
              borderColor="border-neutral"
            >
              <VStack spacing={6}>
                <Text
                  typo="11"
                  bold
                  color="text-neutral-lighter"
                >
                  {t('assistantName', language)}
                </Text>
                {/* The steps are carried by the line breaks, so keep them. */}
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  <Text
                    typo="13"
                    color="text-neutral"
                  >
                    {entry.text}
                  </Text>
                </div>
                {entry.sources && entry.sources.length > 0 && (
                  <HStack
                    align="center"
                    spacing={8}
                  >
                    {entry.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Text
                          as="span"
                          typo="12"
                          color="text-accent-blue"
                        >
                          {source.label}
                        </Text>
                      </a>
                    ))}
                  </HStack>
                )}
                {/*
                 * Where the words came from, and whether ALF has the question
                 * too. An answer with no provenance is the one a student
                 * cannot check, and checking is the whole point here.
                 */}
                <Text
                  typo="12"
                  color="text-neutral-lighter"
                >
                  {[
                    entry.origin === 'guide' ? t('originGuide', language) : '',
                    t(
                      entry.askedInChat ? 'alfAnswering' : 'alfUnreachable',
                      language
                    ),
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </Text>
              </VStack>
            </Box>
          )
        )}

        {pending && (
          <Text
            typo="12"
            color="text-neutral-lighter"
          >
            {t('thinking', language)}
          </Text>
        )}
        {failed && (
          <InlineBanner
            variant="error"
            content={t('assistantFailed', language)}
          />
        )}
      </VStack>

      <Divider withoutSideIndent />

      <VStack spacing={8}>
        {!pending && suggestions.length > 0 && (
          <VStack spacing={4}>
            {suggestions.slice(0, 3).map((suggestion) => (
              <Button
                key={suggestion}
                variant="outlined"
                semantic="secondary"
                size="xs"
                label={suggestion}
                onClick={() => void send(suggestion)}
              />
            ))}
          </VStack>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void send(question)
          }}
        >
          <HStack
            align="center"
            spacing={6}
          >
            <Box grow={1}>
              <input
                value={question}
                placeholder={t('assistantPlaceholder', language)}
                onChange={(event) => setQuestion(event.target.value)}
                aria-label={t('assistantTitle', language)}
                style={INPUT_STYLE}
              />
            </Box>
            <Box shrink={0}>
              <Button
                type="submit"
                variant="filled"
                semantic="primary"
                size="s"
                label={t('send', language)}
                loading={pending}
                disabled={question.trim().length === 0}
              />
            </Box>
          </HStack>
        </form>

        <Button
          variant="ghost"
          semantic="secondary"
          size="xs"
          label={t('backToList', language)}
          onClick={onBack}
        />
      </VStack>
    </VStack>
  )
}

export default Assistant
