import { useMemo } from 'react'
import { useTypedWamData, useWamData } from '@channel.io/app-sdk-wam'
import {
  buildChecklist,
  ChecklistWamArgsSchema,
  type ChecklistWamArgs,
} from '@tutorial/shared'

export interface ChecklistWamDataResult {
  data: ChecklistWamArgs | null
  appId: string
  error: Error | null
}

/**
 * The host hands over the student's answers, and the panel builds the
 * checklist from them.
 *
 * Desk passes wamArgs in the WAM's own URL, so everything here is spent on a
 * query string: twenty-five computed rows came to 28KB encoded and the panel
 * stopped loading with "414 Request-URI Too Large". The deadline rules are
 * compiled into this bundle already, so only the seven stored answers travel
 * and `buildChecklist` does the rest here.
 *
 * Values arrive untyped, so parse before trusting them.
 */
export function useChecklistWamData(): ChecklistWamDataResult {
  const appId = useTypedWamData('appId')
  const completed = useWamData('completed')
  const booked = useWamData('booked')
  const arrivalDate = useWamData('arrivalDate')
  const semesterStart = useWamData('semesterStart')
  const today = useWamData('today')
  const isNew = useWamData('isNew')
  const isInternational = useWamData('isInternational')
  const living = useWamData('living')
  const university = useWamData('university')
  const semester = useWamData('semester')
  const studentName = useWamData('studentName')
  const targetToken = useWamData('targetToken')
  const canSave = useWamData('canSave')
  const view = useWamData('view')
  // The server puts a generated answer here. Desk hands wamArgs to the panel,
  // so this is the one path a server-side answer can travel back on — we were
  // never reading it.
  const assistantAnswer = useWamData('assistantAnswer')

  return useMemo(() => {
    const parsed = ChecklistWamArgsSchema.safeParse({
      completed,
      booked,
      arrivalDate,
      semesterStart,
      today,
      isNew,
      isInternational,
      living,
      university,
      semester,
      studentName,
      targetToken,
      canSave,
      view,
      assistantAnswer,
    })

    if (parsed.success) {
      const profile = {
        isInternational: parsed.data.isInternational,
        living: parsed.data.living,
        university: parsed.data.university,
        semester: parsed.data.semester,
      }
      return {
        data: {
          ...parsed.data,
          items: buildChecklist({
            arrivalDate: parsed.data.arrivalDate,
            semesterStart: parsed.data.semesterStart,
            completed: parsed.data.completed,
            booked: parsed.data.booked,
            today: parsed.data.today,
            profile,
          }),
        },
        appId: appId ?? '',
        error: null,
      }
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
    assistantAnswer,
    canSave,
    isInternational,
    isNew,
    booked,
    completed,
    living,
    studentName,
    semester,
    university,
    semesterStart,
    targetToken,
    today,
    view,
  ])
}
