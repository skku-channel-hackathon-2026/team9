import { useMemo } from 'react'
import { useTypedWamData, useWamData } from '@channel.io/app-sdk-wam'
import { ChecklistWamArgsSchema, type ChecklistWamArgs } from '@tutorial/shared'

export interface ChecklistWamDataResult {
  data: ChecklistWamArgs | null
  appId: string
  error: Error | null
}

/**
 * The host hands the whole checklist over in wamArgs, so the first paint needs
 * no round trip. Values arrive untyped, so parse before trusting them.
 */
export function useChecklistWamData(): ChecklistWamDataResult {
  const appId = useTypedWamData('appId')
  const items = useWamData('items')
  const arrivalDate = useWamData('arrivalDate')
  const semesterStart = useWamData('semesterStart')
  const today = useWamData('today')
  const canSave = useWamData('canSave')

  return useMemo(() => {
    const parsed = ChecklistWamArgsSchema.safeParse({
      items,
      arrivalDate,
      semesterStart,
      today,
      canSave,
    })

    if (parsed.success) {
      return { data: parsed.data, appId: appId ?? '', error: null }
    }

    return {
      data: null,
      appId: appId ?? '',
      error: new Error('The host did not provide a usable checklist.'),
    }
  }, [appId, arrivalDate, canSave, items, semesterStart, today])
}
