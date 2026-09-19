import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCallFunction, useWamSize } from '@channel.io/app-sdk-wam'
import {
  buildChecklist,
  calendarUrl,
  languageFor,
  pick,
  SCHOOL,
  TUTORIAL_FUNCTIONS,
  UNIVERSITIES,
  universityById,
  type Language,
  type ProgressUpdate,
  type RequirementState,
  type SendAsBotInput,
} from '@tutorial/shared'

import { useChecklistWamData } from '../../hooks/useChecklistWamData'
import { t } from './strings'
import './checklist.css'

const LEAD_COUNT = 3

const CATEGORIES = [
  { id: 'all', key: 'all' },
  { id: 'immigration', key: 'catImmigration' },
  { id: 'academic', key: 'catAcademic' },
  { id: 'life', key: 'catLife' },
] as const

const SCOPE_KEY = {
  immigration: 'catImmigration',
  academic: 'catAcademic',
  life: 'catLife',
} as const

/** The number and the word under it, split so the numeral can stand alone. */
function countdown(
  item: RequirementState,
  language: Language
): { value: string; unit: string } {
  if (item.status === 'done') {
    return { value: '✓', unit: t('done', language) }
  }
  if (item.daysLeft === 0) {
    return { value: '0', unit: language === 'ko' ? '오늘' : 'today' }
  }
  const days = Math.abs(item.daysLeft)
  if (item.daysLeft < 0) {
    return {
      value: `−${days}`,
      unit:
        language === 'ko' ? '일 지남' : days === 1 ? 'day late' : 'days late',
    }
  }
  return {
    value: String(days),
    unit: language === 'ko' ? '일 남음' : days === 1 ? 'day left' : 'days left',
  }
}

function shortDate(iso: string, language: Language): string {
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const [year, month, day] = parts
  if (language === 'ko') return `${Number(month)}월 ${Number(day)}일`
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${Number(day)} ${names[Number(month) - 1] ?? month} ${year}`
}

function Row({
  item,
  language,
  onToggle,
  onAsk,
  askState,
  saving,
}: {
  item: RequirementState
  language: Language
  onToggle: (checked: boolean) => void
  onAsk: () => void
  askState: 'idle' | 'sent' | 'asking' | 'failed'
  saving: boolean
}) {
  const count = countdown(item, language)
  const done = item.status === 'done'

  return (
    <div
      className="cl-row"
      data-status={item.status}
    >
      <div className="cl-count">
        <div className="cl-num">{count.value}</div>
        <div className="cl-unit">{count.unit}</div>
      </div>

      <div className="cl-body">
        <div className="cl-namerow">
          <input
            type="checkbox"
            className="cl-tick"
            checked={done}
            data-saving={saving}
            onChange={(event) => onToggle(event.target.checked)}
            aria-label={item.title}
          />
          <div className="cl-name">
            {language === 'ko'
              ? item.title
              : `${item.title} · ${item.officialKo}`}
          </div>
        </div>

        <div className="cl-meta">
          {`${shortDate(item.dueDate, language)} · ${t(SCOPE_KEY[item.scope], language)}${
            item.national ? ` · ${t('legal', language)}` : ''
          }`}
        </div>

        {!done && <div className="cl-why">{item.why}</div>}

        {item.status === 'overdue' && item.recovery.length > 0 && (
          <div className="cl-fix">
            <div className="cl-fix-head">{t('missed', language)}</div>
            {item.recovery.map((step, index) => (
              <div
                className="cl-step"
                key={step}
              >
                <span>{index + 1}.</span>
                <span>{step}</span>
              </div>
            ))}
            {item.penalty && <div className="cl-penalty">{item.penalty}</div>}
          </div>
        )}

        {!done && (
          <div className="cl-meta">
            {item.fee ? `${item.where} · ${item.fee}` : item.where}
            <br />
            {item.bring.join(', ')}
          </div>
        )}

        <div className="cl-actions">
          <button
            type="button"
            className="cl-ask"
            disabled={askState === 'sent' || askState === 'asking'}
            onClick={onAsk}
          >
            {askState === 'sent'
              ? t('asked', language)
              : askState === 'asking'
                ? t('asking', language)
                : t('ask', language)}
          </button>
          {!done && (
            <a
              className="cl-link"
              href={calendarUrl(item, language)}
              target="_blank"
              rel="noreferrer"
            >
              {t('addToCalendar', language)}
            </a>
          )}
          <a
            className="cl-link"
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('source', language)}
          </a>
        </div>
        {askState === 'failed' && (
          <div className="cl-penalty">{t('askFailed', language)}</div>
        )}
      </div>
    </div>
  )
}

function Checklist() {
  const { setSize } = useWamSize()
  const { data, appId, error } = useChecklistWamData()
  const [arrivalDate, setArrivalDate] = useState('')
  const [isInternational, setIsInternational] = useState(true)
  const [living, setLiving] = useState<'dorm' | 'commuter'>('dorm')
  const [university, setUniversity] = useState('skku')
  const [category, setCategory] = useState<string>('all')
  const [completed, setCompleted] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [posted, setPosted] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [asked, setAsked] = useState<
    Record<string, 'sent' | 'asking' | 'failed'>
  >({})
  const [saving, setSaving] = useState<string | null>(null)
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
      setUniversity(data.university)
      setCompleted(
        data.items.filter((item) => item.status === 'done').map((i) => i.id)
      )
      setAsking(data.isNew)
      setHydrated(true)
    }
  }, [data, hydrated])

  const language: Language = languageFor({
    isInternational,
    living,
    university,
  })
  const school = universityById(university)

  const items = useMemo(
    () =>
      data
        ? buildChecklist({
            arrivalDate,
            semesterStart: data.semesterStart,
            completed,
            today: data.today,
            profile: { isInternational, living, university },
          })
        : [],
    [arrivalDate, completed, data, isInternational, living, university]
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
      setSaving(id)
      void persist({ completed: next }).finally(() => setSaving(null))
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
    })
  }, [arrivalDate, completed, isInternational, living, persist, university])

  const startOver = useCallback(() => {
    setCompleted([])
    setExpanded(false)
    setCategory('all')
    setAsking(true)
    void persist({
      completed: [],
      arrivalDate,
      isInternational,
      living,
      university,
    })
  }, [arrivalDate, isInternational, living, persist, university])

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
    return <div className="cl cl-note">{t('loadFailed', 'en')}</div>
  }

  if (asking) {
    return (
      <div className="cl cl-setup">
        <div>
          <div className="cl-title">{t('setupTitle', language)}</div>
          <div className="cl-sub">{t('setupLead', language)}</div>
        </div>

        <div className="cl-field">
          <label
            className="cl-label"
            htmlFor="cl-uni"
          >
            {t('university', language)}
          </label>
          <select
            id="cl-uni"
            className="cl-input"
            value={university}
            onChange={(event) => setUniversity(event.target.value)}
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
            <div className="cl-note">{t('noSchoolDates', language)}</div>
          )}
        </div>

        <div className="cl-field">
          <label
            className="cl-label"
            htmlFor="cl-arrived"
          >
            {t('arrived', language)}
          </label>
          <input
            id="cl-arrived"
            type="date"
            className="cl-input"
            value={arrivalDate}
            max={data.today}
            onChange={(event) => setArrivalDate(event.target.value)}
          />
        </div>

        <div className="cl-field">
          <div className="cl-label">{t('studentType', language)}</div>
          <div className="cl-seg">
            <button
              type="button"
              className="cl-segbtn"
              data-on={isInternational}
              onClick={() => setIsInternational(true)}
            >
              {t('international', language)}
            </button>
            <button
              type="button"
              className="cl-segbtn"
              data-on={!isInternational}
              onClick={() => setIsInternational(false)}
            >
              {t('domestic', language)}
            </button>
          </div>
        </div>

        <div className="cl-field">
          <div className="cl-label">{t('living', language)}</div>
          <div className="cl-seg">
            <button
              type="button"
              className="cl-segbtn"
              data-on={living === 'dorm'}
              onClick={() => setLiving('dorm')}
            >
              {t('dorm', language)}
            </button>
            <button
              type="button"
              className="cl-segbtn"
              data-on={living === 'commuter'}
              onClick={() => setLiving('commuter')}
            >
              {t('commuter', language)}
            </button>
          </div>
        </div>

        <button
          type="button"
          className="cl-go"
          disabled={!arrivalDate}
          onClick={confirm}
        >
          {t('show', language)}
        </button>
        <button
          type="button"
          className="cl-quiet"
          onClick={startOver}
        >
          {t('clear', language)}
        </button>
      </div>
    )
  }

  const visible =
    category === 'all' ? items : items.filter((item) => item.scope === category)
  const outstanding = visible.filter((item) => item.status !== 'done')
  const shown = expanded ? visible : outstanding.slice(0, LEAD_COUNT)
  const doneCount = items.filter((item) => item.status === 'done').length
  const counts: Record<string, number> = {
    all: items.length,
    immigration: items.filter((i) => i.scope === 'immigration').length,
    academic: items.filter((i) => i.scope === 'academic').length,
    life: items.filter((i) => i.scope === 'life').length,
  }

  return (
    <div className="cl">
      <div className="cl-head">
        {data.name && (
          <div className="cl-who">
            {`${data.name} · ${pick(school.name, language)}`}
          </div>
        )}
        <div className="cl-title">
          {outstanding.length > 0
            ? `${Math.min(outstanding.length, LEAD_COUNT)} ${t('headline', language)}`
            : t('headlineNone', language)}
        </div>
        <div className="cl-sub">
          {`${doneCount}/${items.length} ${t('progress', language)} · ${t('filtered', language)}`}
        </div>
      </div>

      <div className="cl-filters">
        {CATEGORIES.filter(
          (option) => option.id === 'all' || counts[option.id]
        ).map((option) => (
          <button
            type="button"
            key={option.id}
            className="cl-chip"
            data-on={category === option.id}
            onClick={() => setCategory(option.id)}
          >
            {`${t(option.key, language)} ${counts[option.id]}`}
          </button>
        ))}
      </div>

      {saveFailed && (
        <div className="cl-penalty">{t('saveFailed', language)}</div>
      )}

      <div className="cl-list">
        {shown.map((item) => (
          <Row
            key={item.id}
            item={item}
            language={language}
            onToggle={toggle(item.id)}
            onAsk={() => void ask(item.id)()}
            askState={asked[item.id] ?? 'idle'}
            saving={saving === item.id}
          />
        ))}
      </div>

      <div className="cl-foot">
        {visible.length > shown.length && (
          <button
            type="button"
            className="cl-quiet"
            onClick={() => setExpanded(true)}
          >
            {`${t('showAll', language)} (${visible.length - shown.length})`}
          </button>
        )}
        {expanded && (
          <button
            type="button"
            className="cl-quiet"
            onClick={() => setExpanded(false)}
          >
            {t('showLess', language)}
          </button>
        )}
        <button
          type="button"
          className="cl-quiet"
          onClick={() => setAsking(true)}
        >
          {t('changeAnswers', language)}
        </button>
        <button
          type="button"
          className="cl-go"
          disabled={posted === 'sent' || posting}
          onClick={() => void share()}
        >
          {posted === 'sent' ? t('posted', language) : t('post', language)}
        </button>
        {posted === 'failed' && (
          <div className="cl-penalty">{t('postFailed', language)}</div>
        )}
        <div className="cl-note">{`${SCHOOL.nameKo} ${SCHOOL.termKo}`}</div>
      </div>
    </div>
  )
}

export default Checklist
