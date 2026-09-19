import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCallFunction, useWamSize } from '@channel.io/app-sdk-wam'
import {
  buildChecklist,
  languageFor,
  SCHOOL,
  TUTORIAL_FUNCTIONS,
  type Language,
  type ProgressUpdate,
  type RequirementState,
  type SendAsBotInput,
} from '@tutorial/shared'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  HStack,
  Icon,
  ProgressBar,
  Text,
  VStack,
} from '@channel.io/bezier-react/beta'
import {
  ClockIcon,
  DocumentIcon,
  ErrorTriangleIcon,
  MapPinIcon,
} from '@channel.io/bezier-icons'
import { InlineBanner } from '@channel.io/app-sdk-wam-ui'

import { useChecklistWamData } from '../../hooks/useChecklistWamData'
import { daysLabel, t } from './strings'

const LEAD_COUNT = 3

const TAG = {
  overdue: { variant: 'red', key: 'overdueTag' },
  urgent: { variant: 'orange', key: 'urgent' },
  soon: { variant: 'yellow', key: 'soonTag' },
  later: { variant: 'neutral-light', key: 'laterTag' },
  done: { variant: 'green', key: 'done' },
} as const

const DATE_INPUT_STYLE = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--bezier-color-border-neutral)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
}

function dueLabel(item: RequirementState, language: Language): string {
  if (item.status === 'done') return t('done', language)
  if (item.daysLeft === 0) return t('dueToday', language)
  const amount = daysLabel(Math.abs(item.daysLeft), language)
  if (item.daysLeft < 0) {
    return language === 'ko' ? `${amount} 지남` : `${amount} overdue`
  }
  return language === 'ko' ? `${amount} 남음` : `${amount} left`
}

function Row({
  item,
  language,
  onToggle,
  onAsk,
  askState,
}: {
  item: RequirementState
  language: Language
  onToggle: (checked: boolean) => void
  onAsk: () => void
  askState: 'idle' | 'sent' | 'failed'
}) {
  const isDone = item.status === 'done'
  const tag = TAG[item.status]

  return (
    <Box
      padding={12}
      borderRadius="8"
      borderWidth={1}
      borderColor="border-neutral"
    >
      <HStack
        align="start"
        spacing={10}
      >
        <Checkbox
          checked={isDone}
          onCheckedChange={onToggle}
        />
        <VStack
          spacing={6}
          grow={1}
        >
          <HStack
            align="center"
            spacing={6}
          >
            <Box shrink={0}>
              <Badge
                size="xs"
                variant={tag.variant}
              >
                {t(tag.key, language)}
              </Badge>
            </Box>
            {item.national && (
              <Box shrink={0}>
                <Badge
                  size="xs"
                  variant="blue"
                >
                  {t('legal', language)}
                </Badge>
              </Box>
            )}
          </HStack>

          <Text
            typo="15"
            bold
            color={isDone ? 'text-neutral-lighter' : 'text-neutral'}
          >
            {language === 'ko'
              ? item.title
              : `${item.title} (${item.officialKo})`}
          </Text>

          <HStack
            as="span"
            align="center"
            spacing={4}
          >
            <Icon
              source={ClockIcon}
              size="12"
              color="icon-neutral"
            />
            <Text
              as="span"
              typo="12"
              color={
                item.status === 'overdue'
                  ? 'text-accent-red'
                  : 'text-neutral-lighter'
              }
            >
              {`${item.dueDate} · ${dueLabel(item, language)}`}
            </Text>
          </HStack>

          <Box
            padding={8}
            borderRadius="6"
            borderWidth={1}
            borderColor="border-neutral"
          >
            <Text
              typo="12"
              bold
              color="text-accent-blue"
            >
              {t('why', language)}
            </Text>
            <Text
              typo="12"
              color="text-neutral-light"
            >
              {item.why}
            </Text>
          </Box>

          <HStack
            as="span"
            align="start"
            spacing={4}
          >
            <Icon
              source={MapPinIcon}
              size="12"
              color="icon-neutral"
            />
            <Text
              as="span"
              typo="12"
              color="text-neutral-lighter"
            >
              {item.fee ? `${item.where} · ${item.fee}` : item.where}
            </Text>
          </HStack>

          <HStack
            as="span"
            align="start"
            spacing={4}
          >
            <Icon
              source={DocumentIcon}
              size="12"
              color="icon-neutral"
            />
            <Text
              as="span"
              typo="12"
              color="text-neutral-lighter"
            >
              {item.bring.join(', ')}
            </Text>
          </HStack>

          {item.status === 'overdue' && item.recovery.length > 0 && (
            <Box
              padding={8}
              borderRadius="6"
              borderWidth={1}
              borderColor="border-neutral"
            >
              <HStack
                as="span"
                align="center"
                spacing={4}
              >
                <Icon
                  source={ErrorTriangleIcon}
                  size="12"
                  color="icon-accent-red"
                />
                <Text
                  as="span"
                  typo="12"
                  bold
                  color="text-accent-red"
                >
                  {t('missed', language)}
                </Text>
              </HStack>
              {item.recovery.map((step, index) => (
                <Text
                  key={step}
                  typo="12"
                  color="text-neutral-light"
                >
                  {`${index + 1}. ${step}`}
                </Text>
              ))}
              {item.penalty && (
                <Text
                  typo="12"
                  color="text-accent-red"
                >
                  {item.penalty}
                </Text>
              )}
            </Box>
          )}

          <HStack
            align="center"
            spacing={8}
          >
            <Button
              variant="outlined"
              semantic="primary"
              size="xs"
              label={
                askState === 'sent' ? t('asked', language) : t('ask', language)
              }
              disabled={askState === 'sent'}
              onClick={onAsk}
            />
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Text
                as="span"
                typo="12"
                color="text-accent-blue"
              >
                {t('source', language)}
              </Text>
            </a>
          </HStack>
          {askState === 'failed' && (
            <Text
              typo="12"
              color="text-accent-red"
            >
              {t('askFailed', language)}
            </Text>
          )}
        </VStack>
      </HStack>
    </Box>
  )
}

function Checklist() {
  const { setSize } = useWamSize()
  const { data, appId, error } = useChecklistWamData()
  const [arrivalDate, setArrivalDate] = useState('')
  const [isInternational, setIsInternational] = useState(true)
  const [living, setLiving] = useState<'dorm' | 'commuter'>('dorm')
  const [completed, setCompleted] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [posted, setPosted] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [asked, setAsked] = useState<Record<string, 'sent' | 'failed'>>({})
  const [hydrated, setHydrated] = useState(false)

  const { call: saveProgress } = useCallFunction<unknown>({
    appId,
    name: TUTORIAL_FUNCTIONS.open,
  })
  const { call: postToChat, loading: posting } = useCallFunction<void>({
    appId,
    name: TUTORIAL_FUNCTIONS.sendAsBot,
  })

  useEffect(() => {
    setSize({ width: 420, height: 620 })
  }, [setSize])

  useEffect(() => {
    if (data && !hydrated) {
      setArrivalDate(data.arrivalDate)
      setIsInternational(data.isInternational)
      setLiving(data.living)
      setCompleted(
        data.items.filter((item) => item.status === 'done').map((i) => i.id)
      )
      setAsking(data.isNew)
      setHydrated(true)
    }
  }, [data, hydrated])

  const language: Language = languageFor({ isInternational, living })

  const items = useMemo(
    () =>
      data
        ? buildChecklist({
            arrivalDate,
            semesterStart: data.semesterStart,
            completed,
            today: data.today,
            profile: { isInternational, living },
          })
        : [],
    [arrivalDate, completed, data, isInternational, living]
  )

  const persist = useCallback(
    async (update: ProgressUpdate) => {
      if (!data?.canSave) {
        setSaveFailed(true)
        return
      }
      try {
        await saveProgress({ input: update })
        setSaveFailed(false)
      } catch {
        setSaveFailed(true)
      }
    },
    [data, saveProgress]
  )

  const toggle = useCallback(
    (id: string) => (checked: boolean) => {
      const next = checked
        ? [...completed, id]
        : completed.filter((each) => each !== id)
      setCompleted(next)
      void persist({ completed: next })
    },
    [completed, persist]
  )

  const ask = useCallback(
    (id: string) => async () => {
      if (!data?.targetToken) {
        setAsked((prev) => ({ ...prev, [id]: 'failed' }))
        return
      }
      try {
        await saveProgress({
          input: { askAbout: id, targetToken: data.targetToken },
        })
        setAsked((prev) => ({ ...prev, [id]: 'sent' }))
      } catch {
        setAsked((prev) => ({ ...prev, [id]: 'failed' }))
      }
    },
    [data, saveProgress]
  )

  const confirm = useCallback(() => {
    setAsking(false)
    void persist({ completed, arrivalDate, isInternational, living })
  }, [arrivalDate, completed, isInternational, living, persist])

  const startOver = useCallback(() => {
    setCompleted([])
    setAsking(false)
    void persist({ completed: [], arrivalDate, isInternational, living })
  }, [arrivalDate, isInternational, living, persist])

  const share = useCallback(async () => {
    if (!data?.targetToken) {
      setPosted('failed')
      return
    }
    try {
      const input: SendAsBotInput = {
        targetToken: data.targetToken,
        broadcast: false,
      }
      await postToChat(input)
      setPosted('sent')
    } catch {
      setPosted('failed')
    }
  }, [data, postToChat])

  if (error || !data) {
    return (
      <InlineBanner
        variant="error"
        content={error?.message ?? t('loadFailed', 'en')}
      />
    )
  }

  if (asking) {
    return (
      <VStack spacing={14}>
        <VStack spacing={4}>
          <Text
            typo="11"
            bold
            color="text-accent-blue"
          >
            {t('setupKicker', language)}
          </Text>
          <Text
            typo="18"
            bold
            color="text-neutral"
          >
            {t('setupTitle', language)}
          </Text>
          <Text
            typo="13"
            color="text-neutral-lighter"
          >
            {t('setupLead', language)}
          </Text>
        </VStack>

        <VStack spacing={4}>
          <Text
            typo="13"
            bold
            color="text-neutral"
          >
            {t('arrived', language)}
          </Text>
          <input
            type="date"
            value={arrivalDate}
            max={data.today}
            onChange={(event) => setArrivalDate(event.target.value)}
            style={DATE_INPUT_STYLE}
          />
        </VStack>

        <VStack spacing={4}>
          <Text
            typo="13"
            bold
            color="text-neutral"
          >
            {t('studentType', language)}
          </Text>
          <HStack spacing={6}>
            <Button
              variant={isInternational ? 'filled' : 'outlined'}
              semantic="primary"
              size="s"
              label={t('international', language)}
              onClick={() => setIsInternational(true)}
            />
            <Button
              variant={isInternational ? 'outlined' : 'filled'}
              semantic="primary"
              size="s"
              label={t('domestic', language)}
              onClick={() => setIsInternational(false)}
            />
          </HStack>
        </VStack>

        <VStack spacing={4}>
          <Text
            typo="13"
            bold
            color="text-neutral"
          >
            {t('living', language)}
          </Text>
          <HStack spacing={6}>
            <Button
              variant={living === 'dorm' ? 'filled' : 'outlined'}
              semantic="primary"
              size="s"
              label={t('dorm', language)}
              onClick={() => setLiving('dorm')}
            />
            <Button
              variant={living === 'commuter' ? 'filled' : 'outlined'}
              semantic="primary"
              size="s"
              label={t('commuter', language)}
              onClick={() => setLiving('commuter')}
            />
          </HStack>
        </VStack>

        <Button
          variant="filled"
          semantic="primary"
          label={t('show', language)}
          disabled={!arrivalDate}
          onClick={confirm}
        />
        <Button
          variant="ghost"
          semantic="secondary"
          size="s"
          label={t('clear', language)}
          onClick={startOver}
        />
      </VStack>
    )
  }

  const outstanding = items.filter((item) => item.status !== 'done')
  const lead = outstanding.slice(0, LEAD_COUNT)
  const rest = expanded ? items.filter((item) => !lead.includes(item)) : []
  const doneCount = items.length - outstanding.length

  return (
    <VStack spacing={12}>
      <VStack spacing={6}>
        <Text
          typo="18"
          bold
          color="text-neutral"
        >
          {lead.length > 0
            ? `${lead.length} ${t('headline', language)}`
            : t('headlineNone', language)}
        </Text>
        <Text
          typo="12"
          color="text-neutral-lighter"
        >
          {t('filtered', language)}
        </Text>
        <ProgressBar
          value={items.length === 0 ? 0 : doneCount / items.length}
          width="100%"
        />
        <HStack
          align="center"
          justify="between"
          spacing={6}
        >
          <Text
            typo="12"
            color="text-neutral-lighter"
          >
            {`${doneCount}/${items.length} ${t('progress', language)} · ${arrivalDate}`}
          </Text>
          <Box shrink={0}>
            <Button
              variant="ghost"
              semantic="secondary"
              size="xs"
              label={t('changeAnswers', language)}
              onClick={() => setAsking(true)}
            />
          </Box>
        </HStack>
      </VStack>

      {saveFailed && (
        <InlineBanner
          variant="error"
          content={t('saveFailed', language)}
        />
      )}

      <VStack spacing={8}>
        {lead.map((item) => (
          <Row
            key={item.id}
            item={item}
            language={language}
            onToggle={toggle(item.id)}
            onAsk={() => void ask(item.id)()}
            askState={asked[item.id] ?? 'idle'}
          />
        ))}
        {rest.map((item) => (
          <Row
            key={item.id}
            item={item}
            language={language}
            onToggle={toggle(item.id)}
            onAsk={() => void ask(item.id)()}
            askState={asked[item.id] ?? 'idle'}
          />
        ))}
      </VStack>

      {items.length > lead.length && (
        <Button
          variant="outlined"
          semantic="secondary"
          size="s"
          label={
            expanded
              ? t('showLess', language)
              : `${t('showAll', language)} (${items.length - lead.length})`
          }
          onClick={() => setExpanded(!expanded)}
        />
      )}

      <Divider withoutSideIndent />
      <VStack spacing={6}>
        <Button
          variant="outlined"
          semantic="primary"
          size="s"
          label={
            posted === 'sent' ? t('posted', language) : t('post', language)
          }
          loading={posting}
          disabled={posted === 'sent'}
          onClick={() => void share()}
        />
        {posted === 'failed' && (
          <Text
            typo="12"
            color="text-accent-red"
          >
            {t('postFailed', language)}
          </Text>
        )}
        <Text
          typo="12"
          color="text-neutral-lighter"
        >
          {`${SCHOOL.nameKo} ${SCHOOL.termKo}`}
        </Text>
      </VStack>
    </VStack>
  )
}

export default Checklist
