import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCallFunction, useWamSize } from '@channel.io/app-sdk-wam'
import {
  CHECKLIST_FUNCTIONS,
  type RequirementState,
  type SaveProgressInput,
} from '@tutorial/shared'
import {
  Badge,
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

function dueLabel(item: RequirementState): string {
  if (item.status === 'done') {
    return '완료'
  }
  if (item.daysLeft < 0) {
    return `${Math.abs(item.daysLeft)}일 지남`
  }
  if (item.daysLeft === 0) {
    return '오늘까지'
  }
  return `${item.daysLeft}일 남음`
}

function Checklist() {
  const { setSize } = useWamSize()
  const { data, appId, error } = useChecklistWamData()
  const [completed, setCompleted] = useState<string[]>([])
  const [saveFailed, setSaveFailed] = useState(false)
  const [ready, setReady] = useState(false)

  const { call: saveProgress } = useCallFunction<{ saved: boolean }>({
    appId,
    name: CHECKLIST_FUNCTIONS.saveProgress,
  })

  useEffect(() => {
    setSize({ width: 420, height: 560 })
  }, [setSize])

  useEffect(() => {
    if (data && !ready) {
      setCompleted(
        data.items.filter((item) => item.status === 'done').map((i) => i.id)
      )
      setReady(true)
    }
  }, [data, ready])

  const items = useMemo(() => data?.items ?? [], [data])
  const outstanding = items.filter((item) => !completed.includes(item.id))
  const next = outstanding[0]
  const doneCount = items.length - outstanding.length

  const toggle = useCallback(
    (id: string) => async (checked: boolean) => {
      const nextCompleted = checked
        ? [...completed, id]
        : completed.filter((each) => each !== id)
      setCompleted(nextCompleted)
      if (!data?.canSave) {
        setSaveFailed(true)
        return
      }
      try {
        const input: SaveProgressInput = { completed: nextCompleted }
        await saveProgress(input)
        setSaveFailed(false)
      } catch {
        setSaveFailed(true)
      }
    },
    [completed, data, saveProgress]
  )

  if (error || !data) {
    return (
      <InlineBanner
        variant="error"
        content={error?.message ?? '체크리스트를 불러오지 못했습니다.'}
      />
    )
  }

  return (
    <VStack spacing={12}>
      <VStack spacing={6}>
        <Text
          typo="13"
          color="text-neutral-lighter"
        >
          {next ? '다음에 해야 할 일' : '지금 처리할 항목이 없습니다'}
        </Text>
        {next && (
          <HStack
            align="center"
            spacing={8}
          >
            <Text
              typo="16"
              bold
              color="text-neutral"
            >
              {next.titleKo}
            </Text>
            <Badge
              size="xs"
              variant={STATUS_VARIANT[next.status]}
            >
              {dueLabel(next)}
            </Badge>
          </HStack>
        )}
        <ProgressBar
          value={items.length === 0 ? 0 : doneCount / items.length}
          width="100%"
        />
        <Text
          typo="12"
          color="text-neutral-lighter"
        >
          {`${doneCount} / ${items.length} 완료 · 기준일 ${data.today}`}
        </Text>
      </VStack>

      {saveFailed && (
        <InlineBanner
          variant="error"
          content="저장하지 못했습니다. 화면에는 반영되지만 다시 열면 사라집니다."
        />
      )}

      <VStack spacing={0}>
        {items.map((item, index) => {
          const isDone = completed.includes(item.id)
          return (
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
                  checked={isDone}
                  onCheckedChange={toggle(item.id)}
                />
                <VStack
                  spacing={4}
                  grow={1}
                >
                  <HStack
                    align="center"
                    justify="between"
                    spacing={6}
                  >
                    <Text
                      typo="14"
                      bold
                      color={isDone ? 'text-neutral-lighter' : 'text-neutral'}
                    >
                      {item.titleKo}
                    </Text>
                    <Badge
                      size="xs"
                      variant={STATUS_VARIANT[isDone ? 'done' : item.status]}
                    >
                      {isDone ? '완료' : dueLabel(item)}
                    </Badge>
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
                      {`${item.dueDate}까지`}
                    </Text>
                    {item.national && (
                      <Badge
                        size="xs"
                        variant="blue"
                      >
                        법정 기한
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
                      출처 확인
                    </Text>
                  </a>
                </VStack>
              </HStack>
            </VStack>
          )
        })}
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
            표시할 항목이 없습니다.
          </Text>
        </HStack>
      )}
    </VStack>
  )
}

export default Checklist
