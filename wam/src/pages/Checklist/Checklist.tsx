import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCallFunction, useWamSize } from '@channel.io/app-sdk-wam'
import {
  buildChecklist,
  CHECKLIST_FUNCTIONS,
  type RequirementState,
  type SaveProgressInput,
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

const STATUS_VARIANT = {
  overdue: 'red',
  urgent: 'orange',
  soon: 'yellow',
  later: 'neutral-light',
  done: 'green',
} as const

const DATE_INPUT_STYLE = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--bezier-color-bg-black-lighter)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
}

function dueLabel(item: RequirementState): string {
  if (item.status === 'done') {
    return 'Done'
  }
  if (item.daysLeft < 0) {
    return `${Math.abs(item.daysLeft)} days overdue`
  }
  if (item.daysLeft === 0) {
    return 'Due today'
  }
  return `${item.daysLeft} days left`
}

function Checklist() {
  const { setSize } = useWamSize()
  const { data, appId, error } = useChecklistWamData()
  const [arrivalDate, setArrivalDate] = useState('')
  const [completed, setCompleted] = useState<string[]>([])
  const [asking, setAsking] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const { call: saveProgress } = useCallFunction<{ saved: boolean }>({
    appId,
    name: CHECKLIST_FUNCTIONS.saveProgress,
  })

  useEffect(() => {
    setSize({ width: 420, height: 580 })
  }, [setSize])

  useEffect(() => {
    if (data && !hydrated) {
      setArrivalDate(data.arrivalDate)
      setCompleted(
        data.items.filter((item) => item.status === 'done').map((i) => i.id)
      )
      setAsking(data.isNew)
      setHydrated(true)
    }
  }, [data, hydrated])

  // Recomputed here rather than fetched, so changing the date is instant.
  const items = useMemo(
    () =>
      data
        ? buildChecklist({
            arrivalDate,
            semesterStart: data.semesterStart,
            completed,
            today: data.today,
          })
        : [],
    [arrivalDate, completed, data]
  )

  const persist = useCallback(
    async (nextCompleted: string[], nextArrival: string) => {
      if (!data?.canSave) {
        setSaveFailed(true)
        return
      }
      try {
        const input: SaveProgressInput = {
          completed: nextCompleted,
          arrivalDate: nextArrival,
        }
        await saveProgress(input)
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
      void persist(next, arrivalDate)
    },
    [arrivalDate, completed, persist]
  )

  const confirmArrival = useCallback(() => {
    setAsking(false)
    void persist(completed, arrivalDate)
  }, [arrivalDate, completed, persist])

  if (error || !data) {
    return (
      <InlineBanner
        variant="error"
        content={error?.message ?? 'Could not load the checklist.'}
      />
    )
  }

  if (asking) {
    return (
      <VStack spacing={12}>
        <VStack spacing={4}>
          <Text
            typo="15"
            bold
            color="text-neutral"
          >
            When did you arrive in Korea?
          </Text>
          <Text
            typo="13"
            color="text-neutral-lighter"
          >
            Every deadline is counted from this date, so it has to be yours.
          </Text>
        </VStack>
        <input
          type="date"
          value={arrivalDate}
          max={data.today}
          onChange={(event) => setArrivalDate(event.target.value)}
          style={DATE_INPUT_STYLE}
        />
        <Button
          variant="filled"
          semantic="primary"
          label="Show my checklist"
          disabled={!arrivalDate}
          onClick={confirmArrival}
        />
      </VStack>
    )
  }

  const outstanding = items.filter((item) => item.status !== 'done')
  const next = outstanding[0]
  const doneCount = items.length - outstanding.length

  return (
    <VStack spacing={12}>
      <VStack spacing={6}>
        <Text
          typo="13"
          color="text-neutral-lighter"
        >
          {next ? 'Next up' : 'Nothing outstanding'}
        </Text>
        {next && (
          <HStack
            align="start"
            justify="between"
            spacing={8}
          >
            <Text
              typo="16"
              bold
              color="text-neutral"
            >
              {next.title}
            </Text>
            <Box shrink={0}>
              <Badge
                size="xs"
                variant={STATUS_VARIANT[next.status]}
              >
                {dueLabel(next)}
              </Badge>
            </Box>
          </HStack>
        )}
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
            {`${doneCount} of ${items.length} done · arrived ${arrivalDate}`}
          </Text>
          <Box shrink={0}>
            <Button
              variant="ghost"
              semantic="secondary"
              size="xs"
              label="Change date"
              onClick={() => setAsking(true)}
            />
          </Box>
        </HStack>
      </VStack>

      {saveFailed && (
        <InlineBanner
          variant="error"
          content="Couldn’t save. The change shows here but won’t survive reopening."
        />
      )}

      <VStack spacing={0}>
        {items.map((item, index) => (
          <VStack
            key={item.id}
            spacing={0}
          >
            {index > 0 && <Divider withoutSideIndent />}
            <HStack
              align="start"
              spacing={8}
              paddingVertical={10}
            >
              <Checkbox
                checked={item.status === 'done'}
                onCheckedChange={toggle(item.id)}
              />
              <VStack
                spacing={4}
                grow={1}
              >
                <HStack
                  align="start"
                  justify="between"
                  spacing={6}
                >
                  <Text
                    typo="14"
                    bold
                    color={
                      item.status === 'done'
                        ? 'text-neutral-lighter'
                        : 'text-neutral'
                    }
                  >
                    {item.title}
                  </Text>
                  <Box shrink={0}>
                    <Badge
                      size="xs"
                      variant={STATUS_VARIANT[item.status]}
                    >
                      {dueLabel(item)}
                    </Badge>
                  </Box>
                </HStack>

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
                    color="text-neutral-lighter"
                  >
                    {`by ${item.dueDate}`}
                  </Text>
                  {item.national && (
                    <Badge
                      size="xs"
                      variant="blue"
                    >
                      Legal deadline
                    </Badge>
                  )}
                </HStack>

                <HStack
                  as="span"
                  align="center"
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
                    View source
                  </Text>
                </a>
              </VStack>
            </HStack>
          </VStack>
        ))}
      </VStack>

      {items.length === 0 && (
        <HStack
          align="center"
          spacing={6}
        >
          <Icon
            source={ErrorTriangleIcon}
            size="12"
            color="icon-neutral"
          />
          <Text
            typo="13"
            color="text-neutral-lighter"
          >
            Nothing to show.
          </Text>
        </HStack>
      )}
    </VStack>
  )
}

export default Checklist
