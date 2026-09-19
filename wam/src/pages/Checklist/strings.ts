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
    en: 'Only what changes your answer. Nothing else.',
    ko: '결과가 바뀌는 것만 묻습니다. 그 외에는 묻지 않습니다.',
  },
  arrived: {
    en: 'When did you arrive in Korea?',
    ko: '한국에 언제 입국했나요?',
  },
  arrivedWhy: {
    en: 'Immigration deadlines are counted from this date.',
    ko: '출입국 관련 기한은 이 날짜부터 계산됩니다.',
  },
  semester: { en: 'Which semester are you in?', ko: '지금 몇 학기인가요?' },
  semFirst: { en: 'First', ko: '1학기' },
  semSecond: { en: 'Second', ko: '2학기' },
  semLater: { en: 'Third or later', ko: '3학기 이상' },
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
  headline: {
    en: 'things matter to you right now',
    ko: '가지가 지금 중요합니다',
  },
  headlineNone: {
    en: 'Nothing needs you right now',
    ko: '지금 처리할 항목이 없습니다',
  },
  filtered: {
    en: 'Filtered to your situation, not everything the university sends.',
    ko: '학교가 보내는 모든 공지가 아니라, 내 상황에 맞는 것만 보여줍니다.',
  },
  why: { en: 'Why', ko: '왜' },
  bring: { en: 'Bring', ko: '무엇을' },
  where: { en: 'Where', ko: '어디로' },
  feeLabel: { en: 'Cost', ko: '얼마를' },
  dueLabel: { en: 'By', ko: '언제까지' },
  basisLabel: { en: 'If missed', ko: '미이행 시' },
  missed: {
    en: 'You can still fix this',
    ko: '지금 하면 돼요',
  },
  source: { en: 'View source', ko: '출처 확인' },
  sourceShort: { en: 'Source', ko: '출처' },
  askShort: { en: 'Ask', ko: '질문' },
  calendarShort: { en: 'Add to calendar', ko: '캘린더' },
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
  edit: { en: 'Edit', ko: '수정' },
  done: { en: 'Done', ko: '완료' },
  dueToday: { en: 'Due today', ko: '오늘까지' },
  legal: { en: 'Legal deadline', ko: '법정 기한' },
  showAll: { en: 'Show everything else', ko: '나머지 전체 보기' },
  showLess: { en: 'Show less', ko: '접기' },
  progress: { en: 'done', ko: '완료' },
  progressOf: { en: 'done of', ko: '개 완료 / 전체' },
  loadFailed: {
    en: 'Could not load the checklist.',
    ko: '체크리스트를 불러오지 못했습니다.',
  },
  ask: { en: 'Ask in the chat', ko: '채팅으로 묻기' },
  university: { en: 'Which university?', ko: '어느 대학교인가요?' },
  noSchoolDates: {
    en: 'Only national immigration rules are loaded for this university. They are the same everywhere. Your own campus deadlines are not in here yet.',
    ko: '이 대학교는 아직 학사 일정이 등록되어 있지 않습니다. 아래 출입국 관련 항목은 전국 공통이라 그대로 적용됩니다.',
  },
  greeting: { en: 'Hello', ko: '안녕하세요' },
  nameLabel: { en: 'What should we call you?', ko: '어떻게 부르면 될까요?' },
  namePlaceholder: { en: 'Your name', ko: '이름' },
  all: { en: 'All', ko: '전체' },
  catImmigration: { en: 'Immigration', ko: '출입국' },
  catAcademic: { en: 'Academic', ko: '학사' },
  catLife: { en: 'Living', ko: '생활' },
  catImmigrationShort: { en: 'Visa', ko: '출입국' },
  catAcademicShort: { en: 'School', ko: '학사' },
  addToCalendar: { en: 'Add to calendar', ko: '캘린더에 추가' },
  calendar: { en: 'Calendar', ko: '캘린더' },
  groupLate: { en: 'Past their date', ko: '기한이 지났어요' },
  groupSoon: { en: 'This month', ko: '이번 달' },
  groupLater: { en: 'Later', ko: '나중에' },
  groupDone: { en: 'Done', ko: '완료' },
  bookedFor: { en: 'Booked for', ko: '예약함' },
  relatedLabel: { en: 'People also ask', ko: '이런 것도 물어봐요' },
  bookLabel: { en: 'Booked for', ko: '예약 날짜' },
  callLabel: {
    en: 'Not sure? The immigration helpline answers in English:',
    ko: '잘 모르겠다면 외국인종합안내센터에 전화하세요:',
  },
  searchPlaceholder: {
    en: 'Search — ARC, tuition, dormitory…',
    ko: '검색 — 외국인등록, 등록금, 기숙사…',
  },
  searchFound: { en: 'found', ko: '건' },
  searchNone: {
    en: 'Nothing matches that. Try the Korean term, or ask in the chat.',
    ko: '검색 결과가 없습니다. 채팅으로 물어보세요.',
  },
  prevMonth: { en: 'Previous month', ko: '이전 달' },
  nextMonth: { en: 'Next month', ko: '다음 달' },
  profileIntl: { en: 'International', ko: '외국인 유학생' },
  profileDomestic: { en: 'Domestic', ko: '국내 학생' },
  profileDorm: { en: 'Dormitory', ko: '기숙사' },
  profileCommuter: { en: 'Commuter', ko: '통학' },
  asking: { en: 'Sending…', ko: '보내는 중…' },
  saving: { en: 'Saving…', ko: '저장 중…' },
  demo: { en: 'DEMO', ko: '데모' },
  demoIntl: { en: 'International · Dorm', ko: '유학생 · 기숙사' },
  demoDomestic: { en: 'Domestic · Commuter', ko: '국내학생 · 통학' },
  assistantOpen: {
    en: 'Ask in the chat about anything on this list',
    ko: '목록에 대해 채팅으로 물어보기',
  },
  assistantTitle: { en: 'Ask about your checklist', ko: '체크리스트 질문하기' },
  assistantLead: {
    en: 'Answered here from the official rules, and passed to ALF in the chat with your dates.',
    ko: '공식 규정을 바탕으로 여기서 답하고, 내 일정과 함께 대화창의 ALF에게도 전달합니다.',
  },
  assistantEmpty: {
    en: 'Ask anything about what you have to do — how to extend your visa, what to bring, what happens if you are late.',
    ko: '무엇이든 물어보세요. 체류기간 연장 방법, 준비물, 기한을 놓쳤을 때 등.',
  },
  assistantPlaceholder: { en: 'Type your question', ko: '질문을 입력하세요' },
  send: { en: 'Send', ko: '보내기' },
  thinking: { en: 'Looking it up…', ko: '확인하고 있습니다…' },
  assistantFailed: {
    en: 'Could not send that one. Try again.',
    ko: '질문을 처리하지 못했습니다. 다시 시도해 주세요.',
  },
  originGuide: {
    en: 'From the official guidance for this procedure.',
    ko: '해당 절차의 공식 안내를 그대로 보여드립니다.',
  },
  alfAnswering: {
    en: 'Your question is in the chat with your own dates attached — ALF is answering it there.',
    ko: '내 일정과 함께 대화창에 질문을 남겼습니다. ALF가 대화창에서 답변합니다.',
  },
  alfUnreachable: {
    en: 'The panel could not pass this on, so ask ALF in the conversation directly for more.',
    ko: '대화창으로 질문을 전달하지 못했습니다. 더 알고 싶다면 ALF에게 직접 물어보세요.',
  },
  you: { en: 'You', ko: '나' },
  assistantName: { en: 'Checklist', ko: '체크리스트' },
  backToList: { en: 'Back to my checklist', ko: '체크리스트로 돌아가기' },
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
