import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useCallFunction, useWamSize } from '@channel.io/app-sdk-wam'
import {
  buildChecklist,
  calendarUrl,
  composeGuideAnswer,
  findGuideFor,
  HELP,
  sourcesFor,
  suggestedQuestions,
  languageFor,
  pick,
  UNIVERSITIES,
  universityById,
  SCHOOL,
  TUTORIAL_FUNCTIONS,
  type AssistantAnswer,
  type Language,
  type Semester,
  type ProgressUpdate,
  type RequirementState,
  type SendAsBotInput,
} from '@tutorial/shared'
import {
  Box,
  Button,
  Checkbox,
  Divider,
  HStack,
  Icon,
  IconButton,
  Search,
  SegmentedControl,
  SegmentedControlItem,
  Text,
  VStack,
} from '@channel.io/bezier-react/beta'
import { CalendarIcon, ChatBubbleIcon } from '@channel.io/bezier-icons'
import { InlineBanner } from '@channel.io/app-sdk-wam-ui'

import { useChecklistWamData } from '../../hooks/useChecklistWamData'
import Assistant from './Assistant'
import Calendar from './Calendar'
import './brand.css'
import { t } from './strings'

/**
 * Where the list breaks. Sorted by date within each, so the panel still reads
 * as a timeline — but the break between "past their date" and the rest is a
 * section boundary rather than a rule drawn across the rows.
 */
const GROUPS = [
  {
    key: 'groupLate',
    holds: (item: RequirementState) => item.status === 'overdue',
  },
  {
    key: 'groupSoon',
    holds: (item: RequirementState) =>
      item.status !== 'overdue' &&
      item.status !== 'done' &&
      item.daysLeft <= 31,
  },
  {
    key: 'groupLater',
    holds: (item: RequirementState) =>
      item.status !== 'overdue' && item.status !== 'done' && item.daysLeft > 31,
  },
  {
    key: 'groupDone',
    holds: (item: RequirementState) => item.status === 'done',
  },
] as const

const CATEGORY = [
  { id: 'all', key: 'all', short: 'all' },
  { id: 'immigration', key: 'catImmigration', short: 'catImmigrationShort' },
  { id: 'academic', key: 'catAcademic', short: 'catAcademicShort' },
  { id: 'life', key: 'catLife', short: 'catLife' },
] as const

const SELECT_STYLE = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border-neutral)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
}

const DATE_INPUT_STYLE = {
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border-neutral)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
}

/** `D+3` when late, `D-12` when coming, the word for today on the day. */
function dayFigure(item: RequirementState, language: Language): string {
  if (item.daysLeft === 0) return language === 'ko' ? '오늘' : 'Today'
  return item.daysLeft < 0 ? `D+${-item.daysLeft}` : `D-${item.daysLeft}`
}

/** `9.16 (수)` / `Sep 16`. A deadline is only actionable as a real date. */
function shortDate(iso: string, language: Language): string {
  const parsed = new Date(`${iso}T00:00:00+09:00`)
  if (Number.isNaN(parsed.getTime())) return iso
  const month = parsed.getMonth() + 1
  const day = parsed.getDate()
  if (language === 'ko') {
    const weekday = ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()]
    return `${month}.${day} (${weekday})`
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Seoul',
  })
}

function Row({
  rowRef,
  item,
  language,
  onToggle,
  onAsk,
  open,
  onOpen,
  late,
}: {
  rowRef: (node: HTMLDivElement | null) => void
  item: RequirementState
  language: Language
  onToggle: (checked: boolean) => void
  /** Opens the question view with this row as its subject. */
  onAsk: () => void
  /** Collapsed rows show only what is needed to decide whether to read on. */
  open: boolean
  onOpen: () => void
  /** Above the today rule. Carried as weight as well as colour. */
  late: boolean
}) {
  const isDone = item.status === 'done'
  const label = (key: 'why' | 'bring' | 'where') => (
    <Box
      shrink={0}
      width={48}
    >
      <Text
        typo="13"
        bold
        color="text-neutral-lighter"
      >
        {t(key, language)}
      </Text>
    </Box>
  )

  return (
    <Box
      ref={rowRef}
      className="skku-row"
      paddingVertical={10}
    >
      <HStack
        align="start"
        spacing={12}
      >
        {/* Where you stand, before any word of the requirement is read. */}
        <Box className="skku-rail skku-tabular">
          <VStack spacing={2}>
            <Text
              typo={dayFigure(item, language).length > 4 ? '18' : '22'}
              bold
              style={{ whiteSpace: 'nowrap' }}
              color={
                isDone
                  ? 'text-neutral-lighter'
                  : late
                    ? 'text-accent-red'
                    : 'text-neutral-light'
              }
            >
              {dayFigure(item, language)}
            </Text>
            <Text
              typo="12"
              color="text-neutral-lighter"
              style={{ whiteSpace: 'nowrap' }}
            >
              {shortDate(item.dueDate, language)}
            </Text>
          </VStack>
        </Box>

        <VStack
          spacing={4}
          grow={1}
          style={{ minWidth: 0 }}
        >
          <Text
            typo="15"
            bold={late && !isDone}
            color={isDone ? 'text-neutral-lighter' : 'text-neutral'}
            onClick={onOpen}
            style={{ cursor: 'pointer' }}
          >
            {item.officialKo}
          </Text>
          <Text
            typo="13"
            color="text-neutral-light"
            onClick={onOpen}
            style={{
              cursor: 'pointer',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {language === 'ko' ? item.why : item.title}
          </Text>
        </VStack>

        {/* The tick is an action, not a state: the left edge already says
            whether this is late, so the control sits out of the reading path. */}
        <Box shrink={0}>
          <Checkbox
            checked={isDone}
            onCheckedChange={onToggle}
          />
        </Box>
      </HStack>

      {open && (
        <Box
          className="skku-note"
          paddingLeft={12}
          marginTop={10}
          marginLeft={84}
        >
          <VStack spacing={12}>
            <HStack
              align="start"
              spacing={8}
            >
              {label('why')}
              <Text
                className="skku-prose"
                typo="14"
                color="text-neutral"
              >
                {item.why}
              </Text>
            </HStack>
            <HStack
              align="start"
              spacing={8}
            >
              {label('bring')}
              <VStack spacing={4}>
                {item.bring.map((each) => (
                  <Text
                    key={each}
                    className="skku-prose"
                    typo="14"
                    color="text-neutral"
                  >
                    {each}
                  </Text>
                ))}
              </VStack>
            </HStack>
            <HStack
              align="start"
              spacing={8}
            >
              {label('where')}
              <Text
                className="skku-prose"
                typo="14"
                color="text-neutral"
              >
                {item.fee ? `${item.where} · ${item.fee}` : item.where}
              </Text>
            </HStack>
          </VStack>
        </Box>
      )}

      {open && item.status === 'overdue' && item.recovery.length > 0 && (
        <Box
          className="skku-note skku-note-late"
          paddingLeft={12}
          marginTop={12}
          marginLeft={84}
        >
          <VStack spacing={6}>
            <Text
              typo="14"
              bold
              color="text-accent-red"
            >
              {t('missed', language)}
            </Text>
            {item.recovery.map((step, index) => (
              <Text
                key={step}
                className="skku-prose"
                typo="14"
                color="text-neutral"
              >
                {`${index + 1}. ${step}`}
              </Text>
            ))}
            {item.penalty && (
              <Text
                typo="13"
                color="text-accent-red"
              >
                {item.penalty}
              </Text>
            )}
          </VStack>
        </Box>
      )}

      {open && (
        <HStack
          align="center"
          spacing={12}
          wrap
          style={{ marginTop: 14, marginLeft: 84 }}
        >
          <Button
            variant="outlined"
            semantic="primary"
            size="xs"
            label={t('ask', language)}
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
                {t('calendarShort', language)}
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
              {t('sourceShort', language)}
            </Text>
          </a>
        </HStack>
      )}
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
  // Collapsed by default: a row showing everything it knows is ten lines, and
  // three of those is a wall of text before the reader has scrolled once.
  const [openRows, setOpenRows] = useState<string[]>([])
  const [category, setCategory] = useState<string>('all')
  const [completed, setCompleted] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [showCalendar, setShowCalendar] = useState(false)
  const [query, setQuery] = useState('')
  const [posted, setPosted] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [hydrated, setHydrated] = useState(false)
  /**
   * Which view the panel is showing. `null` is the list; a string is the
   * question view, carrying the requirement it was opened from, or "" when it
   * was opened from the footer and is about the list as a whole.
   */
  const [conversation, setConversation] = useState<string | null>(null)

  const { call: saveProgress } = useCallFunction<unknown>({
    appId,
    name: TUTORIAL_FUNCTIONS.open,
  })
  const { call: postToChat, loading: posting } = useCallFunction<void>({
    appId,
    name: TUTORIAL_FUNCTIONS.sendAsBot,
  })
  // Questions go through the command's own function for the same reason
  // saving does: tutorial.ask is not in the registration AppStore holds, and
  // a call to a function it does not know about never reaches this server.
  const { call: askAssistant } = useCallFunction<{
    attributes?: { wamArgs?: { assistantAnswer?: AssistantAnswer } }
  }>({
    appId,
    name: TUTORIAL_FUNCTIONS.open,
  })

  useEffect(() => {
    // Desk anchors the panel partway down the chat column, so the room below
    // it is far less than the window height. Asking for 800 pushed the last
    // rows off the bottom of the screen where nothing could reach them.
    setSize({ width: 520, height: 600 })
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
      // Every row now carries its date and the list is never truncated, so
      // the dated view and the brief are the same screen. Nothing to switch.
      // Nothing opens itself. One open row is 300px of a 600px panel, which
      // buys one requirement at the cost of seeing the rest of them.
      setOpenRows([])
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

  const toggleOpen = useCallback((id: string) => {
    setOpenRows((prev) =>
      prev.includes(id) ? prev.filter((each) => each !== id) : [...prev, id]
    )
  }, [])

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

  /**
   * Answer here, and relay in the background.
   *
   * The panel used to read the answer out of the return value of
   * `tutorial.open`. That function returns a `type: "wam"` result, which tells
   * Desk to render a WAM rather than to hand data back to the caller, so in
   * Desk the answer never arrived and every question ended in "could not send
   * that one". Saving never noticed because it ignores what comes back.
   *
   * The guides are in the shared package the panel already imports, so the
   * answer is composed right here: instant, and it cannot fail. The server
   * call still goes out, because that is what puts the question into the chat
   * for ALF with this student's dates attached — but it is now a relay whose
   * failure costs the student nothing.
   */
  const askQuestion = useCallback(
    async (input: { question: string; about?: string }) => {
      const item = input.about
        ? (data?.items.find((candidate) => candidate.id === input.about) ??
          null)
        : null
      const guide = findGuideFor(input.question, item)

      let askedInChat = false
      if (data?.targetToken) {
        try {
          await askAssistant({
            input: {
              question: input.question,
              about: input.about,
              targetToken: data.targetToken,
            },
          })
          askedInChat = true
        } catch {
          askedInChat = false
        }
      }

      const sources = sourcesFor(guide, item, language)
      const followUps = suggestedQuestions(language, item)

      if (guide) {
        return {
          answer: composeGuideAnswer(guide, language),
          origin: 'guide' as const,
          sources,
          followUps,
          askedInChat,
        }
      }

      return {
        answer: [
          language === 'ko'
            ? '이 질문에 대한 안내 자료가 아직 없습니다.'
            : 'I do not have written guidance for that one.',
          askedInChat
            ? language === 'ko'
              ? '대화창에 질문을 남겼으니 ALF 또는 담당자가 답변할 것입니다.'
              : 'Your question is now in the chat, where ALF or a member of staff can answer it.'
            : '',
          language === 'ko'
            ? `출입국 관련은 ${HELP.immigrationPhone} (외국인종합안내센터), 학사 관련은 국제처에 문의하세요.`
            : `For immigration call ${HELP.immigrationPhone}; for university matters ask your international office.`,
        ]
          .filter(Boolean)
          .join(' '),
        origin: 'unavailable' as const,
        sources,
        followUps,
        askedInChat,
      }
    },
    [askAssistant, data, language]
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

  if (conversation !== null) {
    return (
      <Assistant
        language={language}
        item={items.find((candidate) => candidate.id === conversation) ?? null}
        ask={askQuestion}
        onBack={() => setConversation(null)}
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
              size="m"
              label={t('international', language)}
              onClick={() => setIsInternational(true)}
            />
            <Button
              variant={isInternational ? 'outlined' : 'filled'}
              semantic="primary"
              size="m"
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
              size="m"
              label={t('dorm', language)}
              onClick={() => setLiving('dorm')}
            />
            <Button
              variant={living === 'commuter' ? 'filled' : 'outlined'}
              semantic="primary"
              size="m"
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
          size="m"
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
  const doneCount = items.filter((item) => item.status === 'done').length
  const lateCount = items.filter((item) => item.status === 'overdue').length
  const nextUp = [...items]
    .filter((item) => item.status !== 'done')
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))[0]

  // Ascending by date, with the finished sunk to the bottom: the rule can only
  // mean "everything above here is behind" if the list is a timeline.
  // A student searching knows one word — the Korean term, the English name,
  // "passport", "dormitory". All of it is searchable, not just the title.
  const needle = query.trim().toLowerCase()
  const searched =
    needle === ''
      ? visible
      : visible.filter((item) =>
          [item.title, item.officialKo, item.why, item.where, ...item.bring]
            .join(' ')
            .toLowerCase()
            .includes(needle)
        )

  const ordered = [...searched].sort((a, b) => {
    if ((a.status === 'done') !== (b.status === 'done')) {
      return a.status === 'done' ? 1 : -1
    }
    return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0
  })
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
      {/*
        The sentence. A student opens this to find out whether they are in
        trouble, so the panel says so in words before it shows a list — and
        the progress run is its underline, not a band of its own.
      */}
      <VStack spacing={10}>
        <Text
          className="skku-say"
          typo="22"
          color="text-neutral-light"
        >
          {lateCount > 0 ? (
            <>
              <Text
                as="span"
                typo="22"
                bold
                color="text-neutral"
              >
                {language === 'ko'
                  ? `${lateCount}개`
                  : `${lateCount} thing${lateCount === 1 ? '' : 's'}`}
              </Text>
              {language === 'ko'
                ? ' 기한이 지났어요. 아직 할 수 있어요.'
                : ` ${lateCount === 1 ? 'is' : 'are'} past their date. They can still be fixed.`}
            </>
          ) : doneCount === items.length ? (
            language === 'ko' ? (
              '전부 끝났어요. 지금 할 일은 없어요.'
            ) : (
              'Everything is done. Nothing needs you right now.'
            )
          ) : (
            <>
              {language === 'ko'
                ? '기한이 지난 건 없어요. 다음은 '
                : 'Nothing is late. Next is '}
              <Text
                as="span"
                typo="22"
                bold
                color="text-neutral"
              >
                {nextUp ? nextUp.officialKo : ''}
              </Text>
              {language === 'ko' ? ' 입니다.' : '.'}
            </>
          )}
        </Text>

        <Box className="skku-run">
          {items.map((item) => (
            <Box
              key={item.id}
              className={
                item.status === 'done'
                  ? 'skku-seg skku-seg-done'
                  : item.status === 'overdue'
                    ? 'skku-seg skku-seg-late'
                    : 'skku-seg'
              }
            />
          ))}
        </Box>

        <HStack
          align="center"
          justify="between"
          spacing={8}
        >
          <Text
            typo="13"
            color="text-neutral-lighter"
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {[
              data.name,
              t(isInternational ? 'profileIntl' : 'profileDomestic', language),
              t(
                living === 'dorm' ? 'profileDorm' : 'profileCommuter',
                language
              ),
              `${doneCount}/${items.length}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Box shrink={0}>
            <Button
              variant="ghost"
              semantic="secondary"
              size="xs"
              label={t('edit', language)}
              onClick={() => setAsking(true)}
            />
          </Box>
        </HStack>
      </VStack>

      {/* One row, not two: the panel has 600px and every band above the
          first deadline is a band the student did not come for. */}
      <HStack
        align="center"
        spacing={8}
      >
        <Box grow={1}>
          <Search
            size="m"
            allowClear
            placeholder={t('searchPlaceholder', language)}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </Box>
        <Box shrink={0}>
          <IconButton
            size="m"
            variant="ghost"
            semantic="secondary"
            content={CalendarIcon}
            active={showCalendar}
            aria-label={t('calendar', language)}
            onClick={() => setShowCalendar((value) => !value)}
          />
        </Box>
      </HStack>

      {showCalendar && (
        <Calendar
          items={items}
          today={data.today}
          language={language}
          onPick={(id) => {
            setCategory('all')
            setQuery('')
            setOpenRows([id])
            rowRefs.current[id]?.scrollIntoView({ block: 'center' })
          }}
        />
      )}

      {/* While searching, the category chips only narrow a list that is
          already narrow, and the panel has no room to spare. */}
      {needle === '' && (
        <SegmentedControl
          type="radiogroup"
          size="m"
          width="100%"
          value={category}
          onValueChange={setCategory}
        >
          {CATEGORY.filter(
            (option) => option.id === 'all' || counts[option.id] > 0
          ).map((option) => (
            <SegmentedControlItem
              key={option.id}
              value={option.id}
            >
              {`${t(option.short, language)} ${counts[option.id]}`}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      )}

      {saveFailed && (
        <InlineBanner
          variant="error"
          content={t('saveFailed', language)}
        />
      )}

      {/* One list, ascending, with today drawn through it. The split into a
          lead of three and a hidden remainder made the panel hide the very
          thing it is for; the rule does the triage instead. */}
      <Box
        ref={listRef}
        className="skku-list"
      >
        {needle !== '' && (
          <Box paddingVertical={8}>
            <Text
              typo="13"
              color="text-neutral-light"
            >
              {ordered.length === 0
                ? t('searchNone', language)
                : `${ordered.length} ${t('searchFound', language)}`}
            </Text>
          </Box>
        )}
        {GROUPS.map((group) => {
          const rows = ordered.filter((item) => group.holds(item))
          if (rows.length === 0) return null
          return (
            <Fragment key={group.key}>
              {/* The today rule is this gap. A section heading and the air
                  around it say "these are behind" without a coloured line
                  drawn through the middle of the list. */}
              <Box
                paddingTop={needle === '' ? 14 : 0}
                paddingBottom={6}
              >
                <HStack
                  align="baseline"
                  spacing={6}
                >
                  <Text
                    typo="13"
                    bold
                    color="text-neutral-lighter"
                  >
                    {t(group.key, language)}
                  </Text>
                  <Text
                    className="skku-tabular"
                    typo="13"
                    bold
                    color={
                      group.key === 'groupLate'
                        ? 'text-accent-red'
                        : 'text-neutral-lighter'
                    }
                  >
                    {String(rows.length)}
                  </Text>
                </HStack>
              </Box>
              {rows.map((item) => (
                <Row
                  key={item.id}
                  rowRef={(node) => {
                    rowRefs.current[item.id] = node
                  }}
                  item={item}
                  language={language}
                  onToggle={toggle(item.id)}
                  onAsk={() => setConversation(item.id)}
                  open={openRows.includes(item.id)}
                  onOpen={() => toggleOpen(item.id)}
                  late={item.status === 'overdue'}
                />
              ))}
            </Fragment>
          )
        })}
      </Box>

      {/* The assistant is always one tap away without spending a row on
          saying so, which is the convention every chat surface already
          taught this student. */}
      <button
        type="button"
        className="skku-fab"
        aria-label={t('assistantOpen', language)}
        onClick={() => setConversation('')}
      >
        <Icon
          source={ChatBubbleIcon}
          size="20"
          color="icon-inverse-heavier"
        />
      </button>

      <Divider withoutSideIndent />
      <VStack spacing={6}>
        <Button
          variant="outlined"
          semantic="primary"
          size="m"
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
