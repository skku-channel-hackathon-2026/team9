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
  const isNew = useWamData('isNew')
  const isInternational = useWamData('isInternational')
  const living = useWamData('living')
  const university = useWamData('university')
  const semester = useWamData('semester')
  const name = useWamData('name')
  const targetToken = useWamData('targetToken')
  const canSave = useWamData('canSave')

  return useMemo(() => {
    const parsed = ChecklistWamArgsSchema.safeParse({
      items,
      arrivalDate,
      semesterStart,
      today,
      isNew,
      isInternational,
      living,
      university,
      semester,
      name,
      targetToken,
      canSave,
    })

    if (parsed.success) {
      return { data: parsed.data, appId: appId ?? '', error: null }
    }

    if (import.meta.env.DEV) {
      console.error(
        '[checklist] wamArgs failed validation',
        JSON.stringify(parsed.error.issues)
      )
    }

    return {
      data: null,
      appId: appId ?? '',
      error: new Error('The host did not provide a usable checklist.'),
    }
  }, [
    appId,
    arrivalDate,
    canSave,
    isInternational,
    isNew,
    items,
    living,
    name,
    semester,
    university,
    semesterStart,
    targetToken,
    today,
  ])
}
