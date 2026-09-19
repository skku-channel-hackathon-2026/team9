import {
  buildChecklist,
  composeGuideAnswer,
  defaultProgress,
  findGuide,
  sourcesFor,
  suggestedQuestions,
  TUTORIAL_FUNCTIONS,
  type AssistantAnswer,
  type StoredProgress,
} from '@tutorial/shared'

/**
 * Stands in for the Channel host when the WAM runs on its own through
 * `pnpm dev:wam`. Outside Desk there is no host to hand over wamArgs, so the
 * screen would otherwise only ever render its error state.
 *
 * The data is built with the same functions the server uses, and questions
 * and saving are routed exactly as `tutorial.open` routes them, so what
 * happens here is what happens in Desk. Progress is kept in memory for the
 * tab: reloading starts the same person over.
 *
 * Dev only: main.tsx calls this behind import.meta.env.DEV, so it is removed
 * from production builds.
 */
export function installDevPreview(): void {
  if (typeof window === 'undefined' || window.ChannelIOWam) {
    return
  }

  const query = new URLSearchParams(window.location.search)
  const today = new Date().toISOString().slice(0, 10)
  const appearance = query.get('theme') === 'dark' ? 'dark' : 'light'

  // The preview's whole store. The screen reads it back exactly as it reads
  // back what the server saved, so the setup answers change the list here too.
  let progress: StoredProgress = {
    ...defaultProgress(today),
    completed: ['health-insurance'],
    isInternational: query.get('student') !== 'domestic',
    living: query.get('living') === 'commuter' ? 'commuter' : 'dorm',
  }

  const profileOf = (stored: StoredProgress) => ({
    isInternational: stored.isInternational,
    living: stored.living,
    university: stored.university,
    semester: stored.semester,
  })

  const data = (): Record<string, unknown> => ({
    appearance,
    appId: 'preview-app',
    channelId: 'preview-channel',
    managerId: 'preview-manager',
    chatId: 'preview-chat',
    chatType: 'group',
    chatTitle: 'app-dev-verification',
    broadcast: false,
    message: '',
    // A group chat in Desk hands the panel a signed token so it can post into
    // the conversation. There is no chat here, but the UI branches on whether
    // it has one, so the preview carries a stand-in.
    targetToken: 'preview-target-token',
    items: buildChecklist({ ...progress, today, profile: profileOf(progress) }),
    arrivalDate: progress.arrivalDate,
    semesterStart: progress.semesterStart,
    today,
    isNew: query.has('new'),
    isInternational: progress.isInternational,
    living: progress.living,
    university: progress.university,
    semester: progress.semester,
    name: 'Alex',
    canSave: true,
    view: query.has('calendar') ? 'calendar' : 'brief',
  })

  // index.html sets the page background from the host before this module runs,
  // so outside Desk it always falls through to the light value. Apply the
  // preview's own choice here, or dark theme renders light text on white.
  document.body.style.backgroundColor =
    appearance === 'dark' ? '#464748' : '#FFFFFF'

  /** Answers from the written guides, the way the server answers. */
  const answerFor = (question: string, about?: string): AssistantAnswer => {
    const item = about
      ? (buildChecklist({
          ...progress,
          today,
          profile: profileOf(progress),
        }).find((candidate) => candidate.id === about) ?? null)
      : null
    const guide = findGuide(
      item ? `${question} ${item.title} ${item.officialKo}` : question
    )
    return {
      answer: guide
        ? composeGuideAnswer(guide, 'en')
        : 'I do not have written guidance for that one. In Desk this goes to ALF in the chat with your dates attached.',
      origin: guide ? 'guide' : 'unavailable',
      sources: sourcesFor(guide, item, 'en'),
      followUps: suggestedQuestions('en', item),
      // Nothing to post into outside Desk. The panel says so, which is the
      // honest state here and the one worth designing for.
      askedInChat: false,
    }
  }

  window.ChannelIOWam = {
    getWamData: (key) => data()[key],
    setSize: (size) => console.info('[preview] setSize', size),
    callFunction: async ({ name, params }) => {
      console.info('[preview] callFunction', name, params)

      // Questions and saving both travel in tutorial.open's `input`, because
      // that is the one function the AppStore registration holds. The preview
      // has to route them the same way or the panel talks to nothing.
      if (name === TUTORIAL_FUNCTIONS.open) {
        const input =
          (params as { input?: Record<string, unknown> }).input ?? {}

        const question = String(input.question ?? '').trim()
        const assistantAnswer = question
          ? answerFor(
              question,
              typeof input.about === 'string' ? input.about : undefined
            )
          : undefined

        if (Array.isArray(input.completed)) {
          progress = { ...progress, completed: input.completed as string[] }
        }
        for (const key of [
          'arrivalDate',
          'semesterStart',
          'university',
          'semester',
          'living',
        ] as const) {
          if (typeof input[key] === 'string') {
            progress = { ...progress, [key]: input[key] as string }
          }
        }
        if (typeof input.isInternational === 'boolean') {
          progress = { ...progress, isInternational: input.isInternational }
        }

        return {
          type: 'wam',
          attributes: { wamArgs: { ...data(), assistantAnswer } },
        } as never
      }

      return { saved: true, completed: progress.completed } as never
    },
    callNativeFunction: async ({ name }) => {
      console.info('[preview] callNativeFunction', name)
      return {} as never
    },
    close: () => console.info('[preview] close'),
  }
}
