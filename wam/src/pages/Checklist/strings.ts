import type { Language } from '@tutorial/shared'

/** Interface wording. Content wording lives with the requirements. */
export const UI = {
  setupKicker: {
    en: 'RIGHT STUDENT. RIGHT INFORMATION. RIGHT TIME.',
    ko: '맞는 학생에게. 맞는 정보를. 맞는 때에.',
  },
  setupTitle: {
    en: "Let's personalise your checklist",
    ko: '내게 맞는 체크리스트를 만들어요',
  },
  setupLead: {
    en: 'Three questions. Nothing that does not change your answer.',
    ko: '세 가지만 여쭤봅니다. 결과가 바뀌는 것만 묻습니다.',
  },
  arrived: {
    en: 'When did you arrive in Korea?',
    ko: '한국에 언제 입국했나요?',
  },
  studentType: { en: 'Student type', ko: '학생 구분' },
  international: { en: 'International', ko: '외국인 유학생' },
  domestic: { en: 'Domestic', ko: '국내 학생' },
  living: { en: 'Where do you live?', ko: '거주 형태' },
  dorm: { en: 'Dormitory', ko: '기숙사' },
  commuter: { en: 'Commuter', ko: '통학' },
  show: { en: 'Show what matters', ko: '지금 중요한 것 보기' },
  clear: {
    en: 'Clear everything I have ticked',
    ko: '체크한 항목 모두 지우기',
  },
  headline: { en: 'matter to you right now', ko: '가지가 지금 중요합니다' },
  headlineNone: {
    en: 'Nothing needs you right now',
    ko: '지금 처리할 항목이 없습니다',
  },
  filtered: {
    en: 'Filtered to your situation, not everything the university sends.',
    ko: '학교가 보내는 모든 공지가 아니라, 내 상황에 맞는 것만 보여줍니다.',
  },
  why: { en: 'Why this matters to you', ko: '왜 나에게 중요한가요' },
  missed: {
    en: 'Missed it — here is how to fix it',
    ko: '놓쳤어요 — 이렇게 하면 됩니다',
  },
  source: { en: 'View source', ko: '출처 확인' },
  post: { en: 'Post this to the chat', ko: '채팅에 공유하기' },
  posted: { en: 'Posted to the chat', ko: '채팅에 공유했습니다' },
  postFailed: {
    en: 'Could not post. This works in a group chat opened from the command.',
    ko: '공유하지 못했습니다. 커맨드로 연 단체 대화에서만 동작합니다.',
  },
  saveFailed: {
    en: 'Could not save. The change shows here but will not survive reopening.',
    ko: '저장하지 못했습니다. 화면에는 반영되지만 다시 열면 사라집니다.',
  },
  changeAnswers: { en: 'Change my answers', ko: '입력 내용 변경' },
  done: { en: 'Done', ko: '완료' },
  dueToday: { en: 'Due today', ko: '오늘까지' },
  legal: { en: 'Legal deadline', ko: '법정 기한' },
  showAll: { en: 'Show everything else', ko: '나머지 전체 보기' },
  showLess: { en: 'Show less', ko: '접기' },
  progress: { en: 'done', ko: '완료' },
  loadFailed: {
    en: 'Could not load the checklist.',
    ko: '체크리스트를 불러오지 못했습니다.',
  },
  ask: { en: 'Ask about this in the chat', ko: '채팅으로 물어보기' },
  asked: { en: 'Asked in the chat', ko: '채팅에 질문했습니다' },
  askFailed: {
    en: 'Could not ask. Reopen the command from a group chat and try again.',
    ko: '질문을 보내지 못했습니다. 단체 대화에서 커맨드를 다시 실행해 주세요.',
  },
  urgent: { en: 'URGENT', ko: '긴급' },
  overdueTag: { en: 'OVERDUE', ko: '기한 지남' },
  soonTag: { en: 'SOON', ko: '곧 마감' },
  laterTag: { en: 'LATER', ko: '여유 있음' },
} as const

export function t(key: keyof typeof UI, language: Language): string {
  return UI[key][language] || UI[key].en
}

export function daysLabel(count: number, language: Language): string {
  if (language === 'ko') {
    return `${count}일`
  }
  return `${count} ${count === 1 ? 'day' : 'days'}`
}
