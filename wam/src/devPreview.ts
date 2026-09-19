import { buildChecklist, defaultProgress } from '@tutorial/shared'

/**
 * Stands in for the Channel host when the WAM runs on its own through
 * `pnpm dev:wam`. Outside Desk there is no host to hand over wamArgs, so the
 * screen would otherwise only ever render its error state.
 *
 * The data is built with the same functions the server uses, so what shows
 * here matches what Desk will show. Saving is kept in memory for the tab.
 *
 * Dev only: main.tsx calls this behind import.meta.env.DEV, so it is removed
 * from production builds.
 */
export function installDevPreview(): void {
  if (typeof window === 'undefined' || window.ChannelIOWam) {
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  let completed: string[] = ['health-insurance']

  const appearance = new URLSearchParams(window.location.search).get('theme')

  const data = (): Record<string, unknown> => ({
    appearance: appearance === 'dark' ? 'dark' : 'light',
    appId: 'preview-app',
    channelId: 'preview-channel',
    managerId: 'preview-manager',
    chatId: 'preview-chat',
    chatType: 'group',
    chatTitle: 'app-dev-verification',
    broadcast: false,
    message: '',
    items: buildChecklist({
      ...defaultProgress(today),
      completed,
      today,
      profile: {
        isInternational: true,
        living: 'dorm',
        university: 'skku',
        semester: 'first',
      },
    }),
    arrivalDate: defaultProgress(today).arrivalDate,
    semesterStart: defaultProgress(today).semesterStart,
    today,
    isNew: new URLSearchParams(window.location.search).has('new'),
    isInternational: true,
    living: 'dorm',
    university: 'skku',
    semester: 'first',
    name: 'Alex',
    canSave: true,
  })

  // index.html sets the page background from the host before this module runs,
  // so outside Desk it always falls through to the light value. Apply the
  // preview's own choice here, or dark theme renders light text on white.
  document.body.style.backgroundColor =
    appearance === 'dark' ? '#464748' : '#FFFFFF'

  window.ChannelIOWam = {
    getWamData: (key) => data()[key],
    setSize: (size) => console.info('[preview] setSize', size),
    callFunction: async ({ name, params }) => {
      console.info('[preview] callFunction', name, params)
      const next = (params as { completed?: string[] }).completed
      if (Array.isArray(next)) {
        completed = next
      }
      return { saved: true, completed } as never
    },
    callNativeFunction: async ({ name }) => {
      console.info('[preview] callNativeFunction', name)
      return {} as never
    },
    close: () => console.info('[preview] close'),
  }
}
