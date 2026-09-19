import { z } from "zod";

/** Where a requirement comes from. National rules apply at every Korean university. */
export type RequirementScope = "immigration" | "academic" | "life";

/**
 * How a due date is worked out. Immigration deadlines run from the day the
 * student entered the country; university deadlines are published calendar
 * dates that are the same for everyone.
 */
export type RequirementAnchor = "arrival" | "fixed";

/** Who a requirement actually applies to, so nobody reads irrelevant rows. */
export type RequirementAudience = "all" | "international" | "domestic";

/**
 * Universities this build knows about. Immigration rules are national and
 * apply at all of them; only SKKU's own calendar is loaded, and the interface
 * says so rather than showing another school's student an empty list and
 * letting them assume there is nothing to do.
 */
export interface University {
  id: string;
  name: Localized;
  /** True when this build carries that university's own deadlines. */
  hasSchoolDates: boolean;
}

export const UNIVERSITIES: University[] = [
  {
    id: "skku",
    name: { en: "Sungkyunkwan University", ko: "성균관대학교" },
    hasSchoolDates: true,
  },
  {
    id: "yonsei",
    name: { en: "Yonsei University", ko: "연세대학교" },
    hasSchoolDates: false,
  },
  {
    id: "korea",
    name: { en: "Korea University", ko: "고려대학교" },
    hasSchoolDates: false,
  },
  {
    id: "hanyang",
    name: { en: "Hanyang University", ko: "한양대학교" },
    hasSchoolDates: false,
  },
  {
    id: "other",
    name: { en: "Another university", ko: "기타 대학" },
    hasSchoolDates: false,
  },
];

export function universityById(id: string): University {
  return UNIVERSITIES.find((u) => u.id === id) ?? UNIVERSITIES[0]!;
}

/** Where the student lives, when that changes whether a rule applies. */
export type RequirementLiving = "any" | "dorm" | "commuter";

/** A string a student reads, in both languages we serve. */
export interface Localized {
  en: string;
  ko: string;
}

export interface LocalizedList {
  en: string[];
  ko: string[];
}

export type Language = "en" | "ko";

export function pick(value: Localized, language: Language): string {
  return value[language] || value.en;
}

export function pickList(value: LocalizedList, language: Language): string[] {
  const chosen = value[language];
  return chosen.length > 0 ? chosen : value.en;
}

export interface Requirement {
  id: string;
  title: Localized;
  /** The Korean name, kept even in English so it can be shown at an office. */
  officialKo: string;
  scope: RequirementScope;
  anchor: RequirementAnchor;
  /** Days after arrival, for anchor "arrival". */
  dueWithinDays?: number;
  /** Published calendar date (YYYY-MM-DD), for anchor "fixed". */
  dueDate?: string;
  bring: LocalizedList;
  where: Localized;
  fee?: Localized;
  /** One sentence saying why this row is in front of this particular student. */
  why: Localized;
  /** Official page this rule comes from, shown as a citation. */
  sourceUrl: string;
  /** National rules are verified law; school rules vary per university. */
  national: boolean;
  audience: RequirementAudience;
  living: RequirementLiving;
  /**
   * What to do once this has already been missed. Telling a student they are
   * late without telling them how to fix it is worse than saying nothing.
   */
  recovery: LocalizedList;
  /** What being late actually costs, when that is a published figure. */
  penalty?: Localized;
}

/**
 * National rules are Korean immigration requirements and are the same at every
 * university. Seeded rules stand in for one school's published dates.
 */
export const REQUIREMENTS: Requirement[] = [
  // --- Korean immigration law: identical at every university ---
  {
    id: "arc-registration",
    title: {
      en: "Register your Alien Registration Card (ARC)",
      ko: "외국인등록 (ARC) 신청",
    },
    officialKo: "외국인등록",
    scope: "immigration",
    anchor: "arrival",
    dueWithinDays: 90,
    bring: {
      en: [
        "Passport",
        "Application form",
        "One passport photo (3.5cm x 4.5cm)",
        "Certificate of enrolment (재학증명서)",
        "Proof of address",
      ],
      ko: [
        "여권",
        "통합신청서",
        "여권용 사진 1매 (3.5×4.5cm)",
        "재학증명서",
        "체류지 입증 서류",
      ],
    },
    where: {
      en: "Local immigration office — book a slot on HiKorea first",
      ko: "관할 출입국·외국인청 (하이코리아 방문예약 필수)",
    },
    fee: { en: "KRW 30,000, cash only", ko: "30,000원, 현금만 가능" },
    why: {
      en: "Anyone staying in Korea beyond 90 days has to register by law.",
      ko: "90일을 초과해 체류하는 외국인은 법적으로 등록 의무가 있습니다.",
    },
    sourceUrl:
      "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=176&PARENT_ID=139&locale=EN",
    national: true,
    audience: "international",
    living: "any",
    penalty: {
      en: "up to 1 year imprisonment or a fine up to KRW 10,000,000, and possible deportation (Immigration Act Arts. 46, 95)",
      ko: "1년 이하 징역 또는 1천만원 이하 벌금, 강제퇴거 가능 (출입국관리법 제46조·제95조)",
    },
    recovery: {
      en: [
        "Book the earliest HiKorea slot you can get — the delay itself is what is penalised",
        "Bring a written explanation (사유서) of why you are late",
        "Bring the fee in cash; cards are not accepted",
      ],
      ko: [
        "하이코리아에서 가장 빠른 방문 예약을 먼저 잡으세요. 지연 자체가 처벌 대상입니다",
        "지연 사유서를 작성해 가져가세요",
        "수수료는 현금으로 준비하세요. 카드는 받지 않습니다",
      ],
    },
  },
  {
    id: "address-report",
    title: {
      en: "Report your address within 15 days of moving in",
      ko: "체류지 변경 신고 (전입 후 15일 이내)",
    },
    officialKo: "체류지 변경신고",
    scope: "immigration",
    anchor: "arrival",
    dueWithinDays: 15,
    bring: {
      en: [
        "Passport",
        "ARC (if already issued)",
        "Lease or dormitory contract",
      ],
      ko: [
        "여권",
        "외국인등록증 (발급된 경우)",
        "임대차계약서 또는 기숙사 입사확인서",
      ],
    },
    where: {
      en: "Local immigration office, or the district office (주민센터)",
      ko: "관할 출입국·외국인청 또는 주민센터",
    },
    why: {
      en: "The 15-day clock starts the day you move in, not the day you notice.",
      ko: "기한은 전입한 날부터 15일이며, 알게 된 날이 아닙니다.",
    },
    sourceUrl:
      "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=197&PARENT_ID=146&locale=EN",
    national: true,
    audience: "international",
    living: "any",
    penalty: {
      en: "a fine of up to KRW 1,000,000 (Immigration Act Art. 98)",
      ko: "100만원 이하 벌금 (출입국관리법 제98조)",
    },
    recovery: {
      en: [
        "Report it now — the clock runs from the day you moved in, not from today",
        "The district office (주민센터) can take this, and is usually faster than immigration",
        "Some university pages still say 14 days; the Immigration Act says 15",
      ],
      ko: [
        "지금 바로 신고하세요. 기한은 오늘이 아니라 전입한 날부터 계산합니다",
        "주민센터에서도 접수할 수 있고 보통 출입국사무소보다 빠릅니다",
        "일부 대학 안내는 아직 14일로 되어 있지만 출입국관리법은 15일입니다",
      ],
    },
  },
  {
    id: "enrolment-certificate",
    title: {
      en: "Get your certificate of enrolment",
      ko: "재학증명서 발급",
    },
    officialKo: "재학증명서",
    scope: "academic",
    anchor: "arrival",
    dueWithinDays: 60,
    bring: { en: ["Your Kingo ID login"], ko: ["킹고 ID 로그인"] },
    where: {
      en: "Online at icert.skku.edu, any time",
      ko: "icert.skku.edu 온라인, 24시간",
    },
    fee: {
      en: "KRW 500 printed, KRW 750 electronic",
      ko: "출력 500원, 전자문서 750원",
    },
    why: {
      en: "Your alien registration application will not be accepted without it.",
      ko: "외국인등록 신청 시 반드시 필요한 서류입니다.",
    },
    sourceUrl: "https://icert.skku.edu",
    national: false,
    audience: "international",
    living: "any",
    recovery: {
      en: [
        "This is issued online in minutes, so it is never too late",
        "Get it before your immigration appointment, not after",
      ],
      ko: [
        "온라인으로 몇 분이면 발급되므로 늦었다는 개념이 없습니다",
        "출입국 방문 전에 미리 발급받으세요",
      ],
    },
  },
  {
    id: "health-insurance",
    title: {
      en: "Check your national health insurance card arrived",
      ko: "국민건강보험 가입 확인",
    },
    officialKo: "국민건강보험",
    scope: "life",
    anchor: "arrival",
    dueWithinDays: 120,
    bring: { en: ["ARC"], ko: ["외국인등록증"] },
    where: {
      en: "NHIS branch office, or the NHIS website",
      ko: "국민건강보험공단 지사 또는 홈페이지",
    },
    why: {
      en: "D-2 students are enrolled automatically, so this is a check, not a task.",
      ko: "D-2 유학생은 자동 가입되므로 신청이 아니라 확인만 하면 됩니다.",
    },
    sourceUrl: "https://www.nhis.or.kr/english/index.do",
    national: true,
    audience: "international",
    living: "any",
    recovery: {
      en: [
        "As a D-2 student you are enrolled automatically from your alien registration date, so there is nothing to apply for",
        "If no card or bill has reached you, check the address NHIS holds — it follows your registered address",
      ],
      ko: [
        "D-2 유학생은 외국인등록일부터 자동 가입되므로 따로 신청할 것이 없습니다",
        "증서나 고지서가 오지 않았다면 공단에 등록된 주소를 확인하세요",
      ],
    },
  },

  // --- SKKU 2026 Fall: published calendar dates ---
  {
    id: "tuition-payment",
    title: { en: "Pay tuition for the Fall semester", ko: "등록금 납부" },
    officialKo: "등록금 납부",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-08-27",
    bring: {
      en: ["Tuition invoice from the portal", "Your bank details"],
      ko: ["포털에서 출력한 등록금 고지서", "계좌 정보"],
    },
    where: {
      en: "Designated bank, or the SKKU portal",
      ko: "지정 은행 또는 성균관대 포털",
    },
    why: {
      en: "Unpaid registration puts your enrolment itself at risk.",
      ko: "미등록은 학적 유지에 직접 영향을 줍니다.",
    },
    sourceUrl: "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do",
    national: false,
    audience: "all",
    living: "any",
    recovery: {
      en: [
        "There is a supplementary registration period (추가 등록): 31 Aug – 4 Sep",
        "If that has also passed, contact the academic affairs team before the semester ends",
      ],
      ko: [
        "추가 등록 기간이 있습니다: 8월 31일 ~ 9월 4일",
        "이 기간도 지났다면 학기가 끝나기 전에 학사지원팀에 문의하세요",
      ],
    },
  },
  {
    id: "course-registration",
    title: { en: "Register for courses", ko: "수강신청" },
    officialKo: "수강신청",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-08-18",
    bring: { en: ["Your Kingo ID"], ko: ["킹고 ID"] },
    where: {
      en: "SKKU course registration system",
      ko: "성균관대 수강신청 시스템",
    },
    why: {
      en: "Courses you are not registered for do not count, whatever you attend.",
      ko: "수강신청하지 않은 과목은 출석해도 학점이 인정되지 않습니다.",
    },
    sourceUrl:
      "https://www.skku.edu/skku/campus/skk_comm/notice02.do?mode=view&articleNo=131774",
    national: false,
    audience: "all",
    living: "any",
    recovery: {
      en: [
        "The add & drop period (수강신청 확인·변경) runs 31 Aug – 5 Sep and is the normal way to fix this",
        "Exchange students are excluded from pre-registration and use the first-come-first-served round",
      ],
      ko: [
        "수강신청 확인·변경 기간(8월 31일 ~ 9월 5일)이 정상적인 보완 방법입니다",
        "교환학생은 사전수강신청 대상이 아니며 선착순 기간을 이용합니다",
      ],
    },
  },
  {
    id: "course-add-drop",
    title: { en: "Confirm or change your courses", ko: "수강신청 확인·변경" },
    officialKo: "수강신청 확인·변경",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-09-05",
    bring: { en: ["Your Kingo ID"], ko: ["킹고 ID"] },
    where: {
      en: "SKKU course registration system",
      ko: "성균관대 수강신청 시스템",
    },
    why: {
      en: "A course registered by accident is still graded.",
      ko: "잘못 신청한 과목도 그대로 성적이 부여됩니다.",
    },
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    living: "any",
    recovery: {
      en: [
        "After this closes, withdrawal (수강철회) is the remaining route, and that window is short",
        "Check your registered courses now",
      ],
      ko: [
        "이 기간이 끝나면 수강철회만 남으며 기간이 매우 짧습니다",
        "지금 수강신청 내역을 확인하세요",
      ],
    },
  },
  {
    id: "credit-deletion",
    title: { en: "Apply to delete credits", ko: "학점포기 신청" },
    officialKo: "학점포기",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-09-11",
    bring: { en: ["Your Kingo ID"], ko: ["킹고 ID"] },
    where: { en: "SKKU portal", ko: "성균관대 포털" },
    why: {
      en: "This is a different thing from withdrawal, and it closes earlier.",
      ko: "수강철회와는 다른 제도이며 마감이 더 빠릅니다.",
    },
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    living: "any",
    recovery: {
      en: [
        "Check which one you actually needed — this is separate from course withdrawal",
        "Ask your department office what remains available for that course",
      ],
      ko: [
        "수강철회와 별개이므로 어느 쪽이 필요했는지 확인하세요",
        "해당 과목에 대해 남은 방법이 있는지 학과 사무실에 문의하세요",
      ],
    },
  },
  {
    id: "course-withdrawal",
    title: { en: "Withdraw from a course", ko: "수강철회 신청" },
    officialKo: "수강철회",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-09-18",
    bring: {
      en: ["Your Kingo ID", "Advisor approval, if your department requires it"],
      ko: ["킹고 ID", "학과에서 요구하는 경우 지도교수 승인"],
    },
    where: { en: "SKKU portal", ko: "성균관대 포털" },
    why: {
      en: "A course you do not withdraw from is graded as it stands.",
      ko: "철회하지 않은 과목은 그대로 성적이 부여됩니다.",
    },
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    living: "any",
    recovery: {
      en: [
        "Withdrawal for this semester has closed — the course stays on your record and will be graded",
        "Midterms run 19–23 Oct, so there is still time to recover the grade rather than the registration",
        "Ask your department office whether retaking it later is possible for your programme",
      ],
      ko: [
        "이번 학기 수강철회는 마감되었습니다. 해당 과목은 그대로 성적이 부여됩니다",
        "중간시험이 10월 19일~23일이므로 수강 취소 대신 성적을 만회할 시간은 남아 있습니다",
        "재수강 가능 여부는 학과 사무실에 확인하세요",
      ],
    },
  },
  {
    id: "midterm-exams",
    title: { en: "Midterm examinations", ko: "중간시험" },
    officialKo: "중간시험",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-10-19",
    bring: { en: ["Student ID"], ko: ["학생증"] },
    where: { en: "Your course classrooms", ko: "각 교과목 강의실" },
    why: {
      en: "Fixed on the academic calendar, so it will not move for you.",
      ko: "학사일정으로 확정된 일정이라 개인 사정으로 변경되지 않습니다.",
    },
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    living: "any",
    recovery: {
      en: [
        "If you missed one through illness, ask the course office about a make-up (추가시험) immediately — these are time-limited",
      ],
      ko: [
        "질병 등으로 시험을 보지 못했다면 즉시 학과·교과목 담당에 추가시험(추시) 가능 여부를 문의하세요. 기한이 짧습니다",
      ],
    },
  },

  // --- SKKU dormitory, 2026 Fall (dorm.skku.edu notices) ---
  {
    id: "dorm-orientation",
    title: {
      en: "Complete the dormitory orientation and fire-safety course",
      ko: "기숙사 온라인 오리엔테이션·소방안전교육 이수",
    },
    officialKo: "기숙사 온라인 오리엔테이션",
    scope: "life",
    anchor: "fixed",
    dueDate: "2026-09-14",
    bring: { en: ["Your Kingo ID"], ko: ["킹고 ID"] },
    where: { en: "i-Campus, online", ko: "i-Campus 온라인" },
    why: {
      en: "Not completing it is a penalty-point offence, and points accumulate towards losing your room.",
      ko: "미이수 시 벌점이 부과되며, 벌점이 쌓이면 입사 자격에 영향을 줍니다.",
    },
    sourceUrl: "https://dorm.skku.edu/",
    national: false,
    audience: "all",
    living: "dorm",
    penalty: { en: "2 penalty points (벌점 2점)", ko: "벌점 2점" },
    recovery: {
      en: [
        "Contact your dormitory office and ask whether the i-Campus course can still be opened for you",
        "Seoul 명륜학사 02-760-0163, Suwon 봉룡학사 031-290-5026",
        "Ask what your current penalty total is — 10, 15 and 20 points each carry a separate consequence",
      ],
      ko: [
        "기숙사 행정실에 연락해 i-Campus 강좌를 다시 열어줄 수 있는지 문의하세요",
        "명륜학사 02-760-0163, 봉룡학사 031-290-5026",
        "현재 누적 벌점을 확인하세요. 10점·15점·20점마다 별도의 제재가 있습니다",
      ],
    },
  },
  {
    id: "dorm-application",
    title: {
      en: "Apply for a dormitory room",
      ko: "기숙사 입사 신청",
    },
    officialKo: "기숙사 정규 입사 신청",
    scope: "life",
    anchor: "fixed",
    dueDate: "2026-08-09",
    bring: {
      en: [
        "Kingo ID, on a PC — the application does not work on a phone",
        "Your registered home address entered in IT4U",
        "A previous-semester GPA of 1.75 or above",
      ],
      ko: [
        "킹고 ID, PC에서만 가능 (모바일 불가)",
        "IT4U에 입력한 주민등록상 주소",
        "직전 학기 평점 평균 1.75 이상",
      ],
    },
    where: {
      en: "GLS → 신청/자격관리 → 기숙사신청",
      ko: "GLS → 신청/자격관리 → 기숙사신청",
    },
    why: {
      en: "Rooms are only assigned through these rounds — you cannot apply at the dormitory office.",
      ko: "기숙사 방은 신청 기간에만 배정되며 행정실 방문 신청은 불가합니다.",
    },
    sourceUrl: "https://dorm.skku.edu/",
    national: false,
    audience: "all",
    living: "dorm",
    recovery: {
      en: [
        "The regular rounds are over, but the vacancy waitlist (공석대기신청) on GLS is still open — Suwon's runs to 1 December",
        "You may pick only one dormitory and it cannot be changed, so choose the one you would actually accept",
        "When your number comes up you are notified by SMS and must pay by the next day, so keep your phone number current in GLS",
      ],
      ko: [
        "정규 모집은 끝났지만 GLS 공석대기신청은 아직 열려 있습니다. 봉룡학사는 12월 1일까지입니다",
        "희망 기숙사는 한 곳만 선택할 수 있고 수정이 불가하므로 실제로 입사할 곳을 고르세요",
        "대기 순번이 되면 문자로 안내되고 다음 날까지 납부해야 하므로 GLS 연락처를 최신으로 유지하세요",
      ],
    },
  },
  {
    id: "dorm-tb-certificate",
    title: {
      en: "Submit your tuberculosis test result",
      ko: "결핵검진결과서 제출",
    },
    officialKo: "결핵검진결과서",
    scope: "life",
    anchor: "fixed",
    dueDate: "2026-08-22",
    bring: {
      en: [
        "Chest X-ray result issued after 1 June 2026",
        "Your student ID number and room number written on it",
      ],
      ko: [
        "2026년 6월 1일 이후 발급된 흉부 엑스레이 결과서",
        "결과서에 학번과 호실 기재",
      ],
    },
    where: {
      en: "Your dormitory information desk, at check-in",
      ko: "입사 당일 기숙사 안내데스크",
    },
    why: {
      en: "Without it you are not admitted to the building — this one is absolute.",
      ko: "제출하지 않으면 입사 자체가 불가합니다.",
    },
    sourceUrl: "https://dorm.skku.edu/",
    national: false,
    audience: "all",
    living: "dorm",
    recovery: {
      en: [
        "Any hospital or public health centre (보건소) can issue a chest X-ray result, usually same day",
        "It must be dated after 1 June 2026 — an older one will not be accepted",
        "Take it to the dormitory desk; they are staffed outside office hours",
      ],
      ko: [
        "병원이나 보건소에서 흉부 엑스레이 결과서를 당일 발급받을 수 있습니다",
        "2026년 6월 1일 이후 발급분이어야 하며, 이전 서류는 인정되지 않습니다",
        "기숙사 안내데스크는 업무시간 외에도 운영되므로 바로 제출하세요",
      ],
    },
  },
];

export type RequirementStatus =
  "done" | "overdue" | "urgent" | "soon" | "later";

export interface RequirementState {
  id: string;
  title: string;
  /** Kept whatever the language, so it can be shown at a Korean office. */
  officialKo: string;
  scope: RequirementScope;
  bring: string[];
  where: string;
  fee?: string;
  /** Why this row is in front of this student. */
  why: string;
  sourceUrl: string;
  national: boolean;
  recovery: string[];
  penalty?: string;
  /** ISO date (YYYY-MM-DD) this is due. */
  dueDate: string;
  /** Negative once the due date has passed. */
  daysLeft: number;
  status: RequirementStatus;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parses YYYY-MM-DD as a UTC midnight timestamp, or null when malformed. */
export function parseIsoDate(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

export function toIsoDate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(time: number, days: number): number {
  return time + days * MS_PER_DAY;
}

/** Whole days between two UTC midnights. */
export function daysBetween(from: number, to: number): number {
  return Math.round((to - from) / MS_PER_DAY);
}

export function statusFor(daysLeft: number, done: boolean): RequirementStatus {
  if (done) return "done";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 7) return "urgent";
  if (daysLeft <= 30) return "soon";
  return "later";
}

/** The few answers that change which requirements apply. */
export interface StudentProfile {
  /** Immigration requirements only apply to international students. */
  isInternational: boolean;
  /** Some requirements only exist for one living situation. */
  living: "dorm" | "commuter";
  /** Which university's own calendar to apply, if this build has it. */
  university: string;
}

export const StudentProfileSchema = z.object({
  isInternational: z.boolean(),
  living: z.enum(["dorm", "commuter"]).default("dorm"),
  university: z.string().default("skku"),
});

/**
 * International students read this in English, domestic students in Korean.
 * Both sets of words ship either way, so this only decides what is shown.
 */
export function languageFor(profile: StudentProfile): Language {
  return profile.isInternational ? "en" : "ko";
}

export function appliesTo(
  requirement: Requirement,
  profile: StudentProfile,
): boolean {
  // A university's own deadlines are only correct for that university.
  // National rules hold everywhere, so they are always shown.
  if (
    !requirement.national &&
    !universityById(profile.university).hasSchoolDates
  ) {
    return false;
  }
  if (requirement.living !== "any" && requirement.living !== profile.living) {
    return false;
  }
  if (requirement.audience === "all") return true;
  return requirement.audience === "international"
    ? profile.isInternational
    : !profile.isInternational;
}

export interface ChecklistInput {
  /** The student's arrival date, YYYY-MM-DD. */
  arrivalDate: string;
  /** The semester start date, YYYY-MM-DD. */
  semesterStart: string;
  /** Requirement ids the student has already completed. */
  completed: string[];
  /** Today, YYYY-MM-DD. Passed in so the result is deterministic to test. */
  today: string;
  /** Omitted means treat every requirement as applicable. */
  profile?: StudentProfile;
}

/**
 * Turns the requirement catalogue into one student's dated, sorted checklist.
 * Overdue and urgent items come first; completed items sink to the bottom.
 */
export function buildChecklist(input: ChecklistInput): RequirementState[] {
  const arrival = parseIsoDate(input.arrivalDate);
  const today = parseIsoDate(input.today);
  if (arrival === null || today === null) return [];

  const completed = new Set(input.completed);

  const profile = input.profile;
  const language = profile ? languageFor(profile) : "en";
  const applicable = profile
    ? REQUIREMENTS.filter((requirement) => appliesTo(requirement, profile))
    : REQUIREMENTS;

  const states = applicable.flatMap((requirement) => {
    const due =
      requirement.anchor === "fixed"
        ? parseIsoDate(requirement.dueDate ?? "")
        : addDays(arrival, requirement.dueWithinDays ?? 0);
    // A requirement with no workable date is dropped rather than guessed at.
    if (due === null) return [];
    const daysLeft = daysBetween(today, due);
    const done = completed.has(requirement.id);
    return {
      id: requirement.id,
      title: pick(requirement.title, language),
      officialKo: requirement.officialKo,
      scope: requirement.scope,
      bring: pickList(requirement.bring, language),
      where: pick(requirement.where, language),
      fee: requirement.fee ? pick(requirement.fee, language) : undefined,
      why: pick(requirement.why, language),
      sourceUrl: requirement.sourceUrl,
      national: requirement.national,
      recovery: pickList(requirement.recovery, language),
      penalty: requirement.penalty
        ? pick(requirement.penalty, language)
        : undefined,
      dueDate: toIsoDate(due),
      daysLeft,
      status: statusFor(daysLeft, done),
    } satisfies RequirementState;
  });

  /**
   * Done sinks. Among what is left, the most recently missed comes first: a
   * deadline that passed yesterday is usually still recoverable, one that
   * passed a month ago usually is not, so leading with the oldest failure
   * would put the least actionable row at the top. Everything still ahead
   * follows in the order it falls due.
   */
  return states.sort((left, right) => {
    const rank = (item: RequirementState) =>
      item.status === "done" ? 2 : item.daysLeft < 0 ? 0 : 1;
    const leftRank = rank(left);
    const rightRank = rank(right);
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (leftRank === 0) return right.daysLeft - left.daysLeft;
    return left.daysLeft - right.daysLeft;
  });
}

/** The single item to lead with, or null when nothing is outstanding. */
export function nextAction(items: RequirementState[]): RequirementState | null {
  return items.find((item) => item.status !== "done") ?? null;
}

export const StoredProgressSchema = z.object({
  arrivalDate: z.string(),
  semesterStart: z.string(),
  completed: z.array(z.string()),
  isInternational: z.boolean().default(true),
  living: z.enum(["dorm", "commuter"]).default("dorm"),
  university: z.string().default("skku"),
});

export type StoredProgress = z.infer<typeof StoredProgressSchema>;

export const RequirementStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  officialKo: z.string(),
  scope: z.enum(["immigration", "academic", "life"]),
  bring: z.array(z.string()),
  where: z.string(),
  fee: z.string().optional(),
  why: z.string(),
  sourceUrl: z.string(),
  national: z.boolean(),
  recovery: z.array(z.string()),
  penalty: z.string().optional(),
  dueDate: z.string(),
  daysLeft: z.number(),
  status: z.enum(["done", "overdue", "urgent", "soon", "later"]),
});

/** Everything the WAM needs to render the checklist without another call. */
export const ChecklistWamArgsSchema = z.object({
  items: z.array(RequirementStateSchema),
  arrivalDate: z.string(),
  semesterStart: z.string(),
  today: z.string(),
  /** True until this person has saved anything, so the UI can ask their date. */
  isNew: z.boolean(),
  isInternational: z.boolean(),
  living: z.enum(["dorm", "commuter"]),
  university: z.string(),
  /** The reader's name, when Channel gives us one. */
  name: z.string().optional(),
  /** Short-lived signed permission to post into the chat it was opened from. */
  targetToken: z.string().optional(),
  /** False when D1 is unavailable, so the UI can explain why ticks won't stick. */
  canSave: z.boolean(),
});

export type ChecklistWamArgs = z.infer<typeof ChecklistWamArgsSchema>;

/**
 * Progress sent through the command's existing free-form `input` field. That
 * field is part of the contract AppStore already knows about, so saving this
 * way needs no new function and no re-registration.
 */
export const ProgressUpdateSchema = z.object({
  completed: z.array(z.string()).max(50).optional(),
  arrivalDate: z.string().optional(),
  isInternational: z.boolean().optional(),
  living: z.enum(["dorm", "commuter"]).optional(),
  university: z.string().max(32).optional(),
});

export type ProgressUpdate = z.infer<typeof ProgressUpdateSchema>;

/** True when the caller actually sent something worth persisting. */
export function hasProgressUpdate(update: ProgressUpdate): boolean {
  return (
    update.completed !== undefined ||
    update.arrivalDate !== undefined ||
    update.isInternational !== undefined ||
    update.living !== undefined ||
    update.university !== undefined
  );
}

/** Folds a partial update onto stored progress, rejecting a malformed date. */
export function applyProgressUpdate(
  current: StoredProgress,
  update: ProgressUpdate,
): StoredProgress | null {
  if (update.arrivalDate && parseIsoDate(update.arrivalDate) === null) {
    return null;
  }
  return {
    arrivalDate: update.arrivalDate ?? current.arrivalDate,
    semesterStart: current.semesterStart,
    completed: update.completed
      ? Array.from(new Set(update.completed))
      : current.completed,
    isInternational: update.isInternational ?? current.isInternational,
    living: update.living ?? current.living,
    university: update.university ?? current.university,
  };
}

export const SaveProgressInputSchema = z.object({
  completed: z.array(z.string()).max(50),
  arrivalDate: z.string().optional(),
  isInternational: z.boolean().optional(),
});

export type SaveProgressInput = z.infer<typeof SaveProgressInputSchema>;

export const SaveProgressOutputSchema = z.object({
  saved: z.boolean(),
  completed: z.array(z.string()),
});

export const CHECKLIST_FUNCTIONS = {
  saveProgress: "tutorial.saveProgress",
} as const;

/**
 * How far back to assume a student arrived when they have no stored record.
 * Relative rather than fixed: a hardcoded date silently rots into a screen
 * where every requirement reads as overdue.
 */
export const ASSUMED_DAYS_SINCE_ARRIVAL = 30;

/** Starting point for someone opening the checklist for the first time. */
export function defaultProgress(today: string): StoredProgress {
  const parsed = parseIsoDate(today);
  const start =
    parsed === null
      ? today
      : toIsoDate(addDays(parsed, -ASSUMED_DAYS_SINCE_ARRIVAL));
  return {
    arrivalDate: start,
    semesterStart: start,
    completed: [],
    isInternational: true,
    living: "dorm",
    university: "skku",
  };
}

/** Where the university dates in this build come from. */
export const SCHOOL = {
  name: "Sungkyunkwan University",
  nameKo: "성균관대학교",
  term: "2026 Fall",
  termKo: "2026학년도 2학기",
  calendarUrl: "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do",
} as const;

/**
 * A plain-text version of what the student is looking at, for posting into the
 * chat. Korean names are kept alongside the English so the student can show
 * the right word to an office that will not recognise the translation.
 */
export function composeSummary(
  items: RequirementState[],
  today: string,
): string {
  const missed = items.filter((item) => item.status === "overdue");
  const upcoming = items.filter(
    (item) => item.status !== "overdue" && item.status !== "done",
  );

  const lines: string[] = [`Freshman checklist — as of ${today}`];

  if (missed.length > 0) {
    lines.push("", `Already passed (${missed.length})`);
    for (const item of missed) {
      lines.push(
        `• ${item.title} (${item.officialKo}) — ${Math.abs(item.daysLeft)} day${Math.abs(item.daysLeft) === 1 ? "" : "s"} ago, due ${item.dueDate}`,
      );
      const step = item.recovery[0];
      if (step) lines.push(`    what to do: ${step}`);
    }
  }

  if (upcoming.length > 0) {
    lines.push("", `Still ahead (${upcoming.length})`);
    for (const item of upcoming.slice(0, 5)) {
      lines.push(
        `• ${item.title} (${item.officialKo}) — ${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} left, due ${item.dueDate}`,
      );
    }
  }

  if (missed.length === 0 && upcoming.length === 0) {
    lines.push("", "Nothing outstanding.");
  }

  lines.push("", `University dates: ${SCHOOL.nameKo}, ${SCHOOL.termKo}`);
  return lines.join("\n");
}

/**
 * A question the student can drop into the chat about one requirement, for
 * ALF or a staff member to answer. The panel can only state rules; the answer
 * to "but what does this mean for me" belongs in a conversation.
 *
 * It carries the Korean term, the date and the source so whoever answers does
 * not have to go and look any of it up.
 */
export function composeQuestion(
  item: RequirementState,
  language: Language,
  today: string,
): string {
  const overdue = item.daysLeft < 0;
  if (language === "ko") {
    const timing = overdue
      ? `${Math.abs(item.daysLeft)}일 지났습니다`
      : `${item.daysLeft}일 남았습니다`;
    return [
      `❓ ${item.officialKo} 관련 질문입니다.`,
      ``,
      `${item.title} — 마감 ${item.dueDate}, ${timing}.`,
      overdue
        ? `이미 기한이 지났는데 지금 제가 할 수 있는 방법이 있을까요?`
        : `무엇부터 준비해야 하는지 알려주실 수 있을까요?`,
      ``,
      `장소: ${item.where}`,
      `준비물: ${item.bring.join(", ")}`,
      `출처: ${item.sourceUrl}`,
      `(${SCHOOL.nameKo} ${SCHOOL.termKo} 기준 · ${today})`,
    ].join("\n");
  }
  const timing = overdue
    ? `${Math.abs(item.daysLeft)} days ago`
    : `in ${item.daysLeft} days`;
  return [
    `❓ A question about ${item.title} (${item.officialKo}).`,
    ``,
    `It is due ${item.dueDate}, ${timing}.`,
    overdue
      ? `I have already missed it — is there anything I can still do?`
      : `Could someone explain what I need to prepare, and why it matters?`,
    ``,
    `Where: ${item.where}`,
    `Bring: ${item.bring.join(", ")}`,
    `Source: ${item.sourceUrl}`,
    `(${SCHOOL.nameKo} ${SCHOOL.termKo} · as of ${today})`,
  ].join("\n");
}

/** Progress update fields plus the two that ask a question instead of saving. */
export const AskAboutSchema = z.object({
  askAbout: z.string().min(1).max(64),
  targetToken: z.string().min(1),
});

export type AskAbout = z.infer<typeof AskAboutSchema>;
