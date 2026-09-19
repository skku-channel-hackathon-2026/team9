import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCallFunction, useWamSize } from '@channel.io/app-sdk-wam'
import {
  buildChecklist,
  calendarUrl,
  languageFor,
  pick,
  UNIVERSITIES,
  universityById,
  SCHOOL,
  TUTORIAL_FUNCTIONS,
  type Language,
  type Semester,
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
import './brand.css'
import { daysLabel, t } from './strings'

const LEAD_COUNT = 3

const CATEGORY = [
  { id: 'all', key: 'all' },
  { id: 'immigration', key: 'catImmigration' },
  { id: 'academic', key: 'catAcademic' },
  { id: 'life', key: 'catLife' },
] as const

const SCOPE_LABEL = {
  immigration: 'catImmigration',
  academic: 'catAcademic',
  life: 'catLife',
} as const

const SELECT_STYLE = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--bezier-color-border-neutral)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
}

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
  askState: 'idle' | 'sent' | 'asking' | 'failed'
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
            <Box shrink={0}>
              <Badge
                size="xs"
                variant="neutral-light"
              >
                {t(SCOPE_LABEL[item.scope], language)}
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
            <VStack spacing={2}>
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
            </VStack>
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
              <VStack spacing={3}>
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
              </VStack>
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
                askState === 'sent'
                  ? t('asked', language)
                  : askState === 'asking'
                    ? t('asking', language)
                    : t('ask', language)
              }
              disabled={askState === 'sent' || askState === 'asking'}
              onClick={onAsk}
            />
            {item.status !== 'done' && (
              <a
                href={calendarUrl(item, language)}
                target="_blank"
                rel="noreferrer"
              >
                <Text
                  as="span"
                  typo="12"
                  color="text-accent-blue"
                >
                  {t('addToCalendar', language)}
                </Text>
              </a>
            )}
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
  const [university, setUniversity] = useState('skku')
  const [semester, setSemester] = useState<Semester>('first')
  const [category, setCategory] = useState<string>('all')
  const [completed, setCompleted] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [posted, setPosted] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [asked, setAsked] = useState<
    Record<string, 'sent' | 'asking' | 'failed'>
  >({})
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
    setSize({ width: 520, height: 800 })
  }, [setSize])

  useEffect(() => {
    if (data && !hydrated) {
      setArrivalDate(data.arrivalDate)
      setIsInternational(data.isInternational)
      setLiving(data.living)
      setUniversity(data.university)
      setSemester(data.semester)
      setCompleted(
        data.items.filter((item) => item.status === 'done').map((i) => i.id)
      )
      setAsking(data.isNew)
      setHydrated(true)
    }
  }, [data, hydrated])

  const profile = { isInternational, living, university, semester }
  const language: Language = languageFor(profile)
  const school = universityById(university)

  const items = useMemo(
    () =>
      data
        ? buildChecklist({
            arrivalDate,
            semesterStart: data.semesterStart,
            completed,
            today: data.today,
            profile: { isInternational, living, university, semester },
          })
        : [],
    [
      arrivalDate,
      completed,
      data,
      isInternational,
      living,
      semester,
      university,
    ]
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
      setAsked((prev) => ({ ...prev, [id]: 'asking' }))
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
    void persist({
      completed,
      arrivalDate,
      isInternational,
      living,
      university,
      semester,
    })
  }, [
    arrivalDate,
    completed,
    isInternational,
    living,
    persist,
    semester,
    university,
  ])

  const startOver = useCallback(() => {
    setCompleted([])
    setAsking(false)
    void persist({
      completed: [],
      arrivalDate,
      isInternational,
      living,
      university,
      semester,
    })
  }, [arrivalDate, isInternational, living, persist, semester, university])

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
      <VStack
        className="skku"
        spacing={14}
      >
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
            {t('university', language)}
          </Text>
          <select
            value={university}
            onChange={(event) => setUniversity(event.target.value)}
            style={SELECT_STYLE}
          >
            {UNIVERSITIES.map((option) => (
              <option
                key={option.id}
                value={option.id}
              >
                {pick(option.name, language)}
              </option>
            ))}
          </select>
          {!school.hasSchoolDates && (
            <Text
              typo="12"
              color="text-neutral-lighter"
            >
              {t('noSchoolDates', language)}
            </Text>
          )}
        </VStack>

        <VStack spacing={4}>
          <Text
            typo="13"
            bold
            color="text-neutral"
          >
            {t('semester', language)}
          </Text>
          <HStack spacing={6}>
            <Button
              variant={semester === 'first' ? 'filled' : 'outlined'}
              semantic="primary"
              size="s"
              label={t('semFirst', language)}
              onClick={() => setSemester('first')}
            />
            <Button
              variant={semester === 'second' ? 'filled' : 'outlined'}
              semantic="primary"
              size="s"
              label={t('semSecond', language)}
              onClick={() => setSemester('second')}
            />
            <Button
              variant={semester === 'later' ? 'filled' : 'outlined'}
              semantic="primary"
              size="s"
              label={t('semLater', language)}
              onClick={() => setSemester('later')}
            />
          </HStack>
        </VStack>

        {isInternational && (
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
            <Text
              typo="12"
              color="text-neutral-lighter"
            >
              {t('arrivedWhy', language)}
            </Text>
          </VStack>
        )}

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
          disabled={isInternational && !arrivalDate}
          onClick={confirm}
        />
        <Button
          variant="ghost"
          semantic="secondary"
          size="s"
          label={t('clear', language)}
          onClick={startOver}
        />
        <HStack
          align="center"
          spacing={6}
        >
          <Text
            typo="11"
            color="text-neutral-lighter"
          >
            {t('demo', language)}
          </Text>
          <Button
            variant="ghost"
            semantic="secondary"
            size="xs"
            label={t('demoIntl', language)}
            onClick={() => {
              setIsInternational(true)
              setLiving('dorm')
              setUniversity('skku')
            }}
          />
          <Button
            variant="ghost"
            semantic="secondary"
            size="xs"
            label={t('demoDomestic', language)}
            onClick={() => {
              setIsInternational(false)
              setLiving('commuter')
              setUniversity('skku')
            }}
          />
        </HStack>
      </VStack>
    )
  }

  const visible =
    category === 'all' ? items : items.filter((item) => item.scope === category)
  const outstanding = visible.filter((item) => item.status !== 'done')
  const lead = expanded ? visible : outstanding.slice(0, LEAD_COUNT)
  const rest: RequirementState[] = []
  const doneCount = items.filter((item) => item.status === 'done').length
  const counts = {
    all: items.length,
    immigration: items.filter((i) => i.scope === 'immigration').length,
    academic: items.filter((i) => i.scope === 'academic').length,
    life: items.filter((i) => i.scope === 'life').length,
  } as Record<string, number>

  return (
    <VStack
      className="skku"
      spacing={12}
    >
      <VStack spacing={6}>
        {data.name && (
          <Text
            typo="13"
            color="text-neutral-lighter"
          >
            {`${t('greeting', language)}, ${data.name} · ${pick(school.name, language)}`}
          </Text>
        )}
        <Text
          typo="18"
          bold
          color="text-neutral"
        >
          {outstanding.length > 0
            ? `${Math.min(outstanding.length, LEAD_COUNT)} ${t('headline', language)}`
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

      <HStack
        align="center"
        spacing={4}
      >
        {CATEGORY.filter(
          (option) => option.id === 'all' || counts[option.id] > 0
        ).map((option) => (
          <Button
            key={option.id}
            variant={category === option.id ? 'filled' : 'outlined'}
            semantic="secondary"
            size="xs"
            label={`${t(option.key, language)} ${counts[option.id]}`}
            onClick={() => setCategory(option.id)}
          />
        ))}
      </HStack>

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

      {visible.length > lead.length && (
        <Button
          variant="outlined"
          semantic="secondary"
          size="s"
          label={
            expanded
              ? t('showLess', language)
              : `${t('showAll', language)} (${visible.length - lead.length})`
          }
          onClick={() => setExpanded(true)}
        />
      )}
      {expanded && (
        <Button
          variant="ghost"
          semantic="secondary"
          size="xs"
          label={t('showLess', language)}
          onClick={() => setExpanded(false)}
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
