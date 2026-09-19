import { useMemo, useState } from 'react'
import {
  Box,
  HStack,
  IconButton,
  Text,
  VStack,
} from '@channel.io/bezier-react/beta'
import { ChevronLeftIcon, ChevronRightIcon } from '@channel.io/bezier-icons'
import type { Language, RequirementState } from '@tutorial/shared'

import { t } from './strings'

const WEEKDAYS = {
  en: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  ko: ['일', '월', '화', '수', '목', '금', '토'],
} as const

/** Days in the month, and the weekday the first of it falls on. */
function monthShape(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1))
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return { lead: first.getUTCDay(), days }
}

function monthLabel(year: number, month: number, language: Language): string {
  if (language === 'ko') return `${year}년 ${month + 1}월`
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * The same deadlines, laid out as a month.
 *
 * The list answers "what do I do next"; a student planning a week asks "what
 * is this month going to cost me", and that question is only answerable on a
 * grid. Tapping a marked day opens that requirement in the list rather than
 * showing it here, so there is one place a requirement is ever read.
 */
export default function Calendar({
  items,
  today,
  language,
  onPick,
}: {
  items: RequirementState[]
  /** ISO date, so the grid agrees with the list about what "today" is. */
  today: string
  language: Language
  onPick: (id: string) => void
}) {
  const [year, month, todayDay] = today.split('-').map(Number)
  const [offset, setOffset] = useState(0)

  const shown = useMemo(() => {
    const base = new Date(Date.UTC(year, month - 1 + offset, 1))
    return { year: base.getUTCFullYear(), month: base.getUTCMonth() }
  }, [year, month, offset])

  // Every day that costs the student something, and what it costs.
  const byDay = useMemo(() => {
    const map = new Map<number, RequirementState[]>()
    for (const item of items) {
      const [y, m, d] = item.dueDate.split('-').map(Number)
      if (y !== shown.year || m - 1 !== shown.month) continue
      map.set(d, [...(map.get(d) ?? []), item])
    }
    return map
  }, [items, shown])

  const { lead, days } = monthShape(shown.year, shown.month)
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const isThisMonth = shown.year === year && shown.month === month - 1

  return (
    <VStack spacing={8}>
      <HStack
        align="center"
        justify="between"
      >
        <Text
          typo="13"
          bold
          color="text-neutral"
        >
          {monthLabel(shown.year, shown.month, language)}
        </Text>
        <HStack
          align="center"
          spacing={2}
        >
          <IconButton
            size="xs"
            variant="ghost"
            semantic="secondary"
            content={ChevronLeftIcon}
            aria-label={t('prevMonth', language)}
            onClick={() => setOffset((value) => value - 1)}
          />
          <IconButton
            size="xs"
            variant="ghost"
            semantic="secondary"
            content={ChevronRightIcon}
            aria-label={t('nextMonth', language)}
            onClick={() => setOffset((value) => value + 1)}
          />
        </HStack>
      </HStack>

      <Box
        display="block"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          rowGap: 2,
        }}
      >
        {WEEKDAYS[language].map((day, index) => (
          <Box
            key={`${day}-${index}`}
            paddingVertical={4}
            style={{ textAlign: 'center' }}
          >
            <Text
              typo="11"
              color="text-neutral-lighter"
            >
              {day}
            </Text>
          </Box>
        ))}

        {cells.map((day, index) => {
          if (day === null) return <Box key={`pad-${index}`} />
          const due = byDay.get(day) ?? []
          const isToday = isThisMonth && day === todayDay
          const late = due.some((item) => item.status === 'overdue')
          const allDone =
            due.length > 0 && due.every((i) => i.status === 'done')
          return (
            <Box
              key={day}
              as={due.length > 0 ? 'button' : 'div'}
              className={isToday ? 'skku-cal-today' : undefined}
              paddingVertical={4}
              style={{
                textAlign: 'center',
                cursor: due.length > 0 ? 'pointer' : 'default',
                background: 'none',
                border: 'none',
                font: 'inherit',
                padding: '4px 0',
              }}
              onClick={due.length > 0 ? () => onPick(due[0]!.id) : undefined}
            >
              <VStack
                spacing={2}
                align="center"
              >
                <Text
                  className="skku-tabular"
                  typo="13"
                  bold={due.length > 0}
                  color={
                    due.length > 0 ? 'text-neutral' : 'text-neutral-lighter'
                  }
                >
                  {day}
                </Text>
                {/* One dot per day, not one per deadline: the grid answers
                    "is this day spoken for", and the list answers the rest. */}
                <Box
                  className={
                    due.length === 0
                      ? 'skku-dot'
                      : allDone
                        ? 'skku-dot skku-dot-done'
                        : late
                          ? 'skku-dot skku-dot-late'
                          : 'skku-dot skku-dot-due'
                  }
                />
              </VStack>
            </Box>
          )
        })}
      </Box>
    </VStack>
  )
}
