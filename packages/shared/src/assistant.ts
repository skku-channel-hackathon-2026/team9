import { z } from "zod";
import {
  pick,
  pickList,
  type Language,
  type Localized,
  type LocalizedList,
  type RequirementState,
  type StudentProfile,
} from "./checklist.js";

/**
 * The checklist can state a rule. It cannot answer "but what about me" —
 * "my visa expires in March, do I extend it before or after I re-register?",
 * "can I work while I study?", "I lost my card". Those questions are the
 * reason a student gives up on the list, so the panel takes them instead of
 * sending the student back out to search.
 *
 * Two things answer them, and the panel does both at once. The written guides
 * below cover the procedures that have no date and so never appear as a row;
 * one of them comes back immediately, in the panel, with no network round
 * trip to anything that can be down. Anything beyond them belongs in a
 * conversation, so the same question is handed to ALF in the chat — with this
 * student's own dates attached, because ALF answering from the general
 * internet is exactly the failure this panel exists to prevent.
 *
 * Nothing here invents a date, a fee or a consequence. Everything a student
 * reads is either written out below or comes from their own checklist.
 */

/** One turn of the panel's conversation, kept for the screen only. */
export const AssistantTurnSchema = z.object({
  role: z.enum(["student", "assistant"]),
  text: z.string().max(2000),
});

export type AssistantTurn = z.infer<typeof AssistantTurnSchema>;

export const AssistantAskInputSchema = z.object({
  question: z.string().min(1).max(600),
  /** A requirement id, when the question was asked from one of the rows. */
  about: z.string().max(64).optional(),
  /**
   * Short-lived signed permission to post into the chat the panel was opened
   * from. Without it the question is answered in the panel and goes no
   * further, which is what happens outside a group chat.
   */
  targetToken: z.string().max(2048).optional(),
});

export type AssistantAskInput = z.infer<typeof AssistantAskInputSchema>;

export const AssistantSourceSchema = z.object({
  label: z.string(),
  url: z.string(),
});

export type AssistantSource = z.infer<typeof AssistantSourceSchema>;

/**
 * Where the panel's answer came from, kept in the contract because the
 * student is entitled to know which they are reading: "guide" is the written
 * text below, verbatim; "unavailable" is an honest miss with somewhere human
 * to go next. Either way `askedInChat` says whether ALF has the question too.
 */
export const AssistantAnswerSchema = z.object({
  answer: z.string(),
  origin: z.enum(["guide", "unavailable"]),
  sources: z.array(AssistantSourceSchema),
  /** Questions the student is likely to have next, ready to tap. */
  followUps: z.array(z.string()),
  /** True when the question reached the chat, where ALF answers it. */
  askedInChat: z.boolean(),
});

export type AssistantAnswer = z.infer<typeof AssistantAnswerSchema>;

export const ASSISTANT_FUNCTIONS = {
  ask: "tutorial.ask",
} as const;

/**
 * A procedure with no deadline of its own, so it is never a checklist row,
 * but which every student eventually needs. Written out here, with its
 * source, rather than left to whatever answers the question: these are the
 * ones that have to be right.
 */
export interface Guide {
  id: string;
  title: Localized;
  /** The Korean name of the procedure, to say at a counter. */
  officialKo: string;
  /** Lowercase terms, either language, that make this the right guide. */
  keywords: string[];
  summary: Localized;
  steps: LocalizedList;
  bring: LocalizedList;
  where: Localized;
  fee?: Localized;
  /** When it has to happen — the part students get wrong. */
  timing: Localized;
  warning?: Localized;
  sourceUrl: string;
}

/** Where to go when neither the checklist nor a guide covers the question. */
export const HELP = {
  immigrationPhone: "1345",
  hikorea: "https://www.hikorea.go.kr/Main.pt?locale=EN",
} as const;

export const GUIDES: Guide[] = [
  {
    id: "visa-extension",
    title: {
      en: "Extending your stay (D-2 visa extension)",
      ko: "체류기간 연장허가",
    },
    officialKo: "체류기간 연장허가",
    keywords: [
      "extend",
      "extension",
      "renew",
      "renewal",
      "expire",
      "expires",
      "expiry",
      "visa",
      "d-2",
      "d2",
      "stay longer",
      "연장",
      "체류기간",
      "비자",
      "만료",
    ],
    summary: {
      en: "Your visa lets you stay until the date printed on your ARC. Extending is a separate application you make before that date — it is not automatic, and re-registering your address does not extend it.",
      ko: "외국인등록증에 적힌 체류만료일까지만 체류할 수 있습니다. 연장은 만료일 전에 따로 신청해야 하며 자동으로 되지 않습니다.",
    },
    steps: {
      en: [
        "Check the expiry date on the back of your ARC",
        "Ask your university's international office for the documents they issue — enrolment and grades",
        "Apply on HiKorea (e-Application), or book a visit at your immigration office",
        "Keep the receipt: it is your proof you applied in time",
      ],
      ko: [
        "외국인등록증 뒷면의 체류만료일을 확인하세요",
        "국제처에서 재학증명서·성적증명서를 발급받으세요",
        "하이코리아 전자민원으로 신청하거나 출입국사무소 방문 예약을 하세요",
        "접수증을 보관하세요. 기한 내 신청했다는 증거입니다",
      ],
    },
    bring: {
      en: [
        "Passport and ARC",
        "Application form (통합신청서)",
        "Certificate of enrolment (재학증명서)",
        "Transcript (성적증명서)",
        "Proof of tuition payment",
        "Proof you can support yourself (bank balance certificate)",
      ],
      ko: [
        "여권, 외국인등록증",
        "통합신청서",
        "재학증명서",
        "성적증명서",
        "등록금 납부 증명",
        "잔고증명서 등 체류 경비 입증 서류",
      ],
    },
    where: {
      en: "HiKorea online, or your local immigration office by appointment",
      ko: "하이코리아 전자민원 또는 관할 출입국·외국인청 (방문예약)",
    },
    fee: {
      en: "KRW 60,000 at the office; the HiKorea online application costs less — HiKorea shows the current figure",
      ko: "방문 신청 6만원, 하이코리아 전자민원은 더 저렴합니다. 정확한 금액은 하이코리아에서 확인하세요",
    },
    timing: {
      en: "Apply before your stay expires. HiKorea accepts applications from about four months before the expiry date, so there is no reason to leave it to the last week.",
      ko: "체류만료일 전에 신청해야 합니다. 하이코리아는 만료 약 4개월 전부터 접수하므로 미루지 마세요.",
    },
    warning: {
      en: "Staying past the expiry date without having applied is overstaying: a fine, and in serious cases a re-entry ban. If the date has already passed, call 1345 today and ask what to do — do not simply go to class.",
      ko: "신청 없이 만료일이 지나면 불법체류가 되어 범칙금, 심하면 입국규제 대상이 됩니다. 이미 지났다면 오늘 1345로 문의하세요.",
    },
    sourceUrl: "https://www.hikorea.go.kr/Main.pt?locale=EN",
  },
  {
    id: "work-permit",
    title: {
      en: "Working part-time while you study",
      ko: "시간제취업 (아르바이트) 허가",
    },
    officialKo: "시간제취업 허가",
    keywords: [
      "work",
      "working",
      "job",
      "part-time",
      "part time",
      "parttime",
      "arbeit",
      "earn",
      "money",
      "salary",
      "employment",
      "아르바이트",
      "알바",
      "시간제",
      "취업",
      "일하",
    ],
    summary: {
      en: "A D-2 student visa does not include the right to work. You need permission for part-time work (시간제취업 허가) before you start, and it is tied to the specific workplace.",
      ko: "D-2 유학생 비자만으로는 일할 수 없습니다. 근무 시작 전에 시간제취업 허가를 받아야 하며, 허가는 특정 근무처에 한해 유효합니다.",
    },
    steps: {
      en: [
        "Have the employer confirm the job in writing, with hours and the workplace",
        "Get your international office's confirmation — they check your grades and attendance",
        "Apply on HiKorea or at the immigration office before your first shift",
        "Apply again if you change employer: the permission does not move with you",
      ],
      ko: [
        "근무처·근무시간이 적힌 고용주 확인서를 받으세요",
        "국제처 확인서를 받으세요. 성적·출석 요건을 확인합니다",
        "첫 근무 전에 하이코리아 또는 출입국사무소에 신청하세요",
        "근무처를 바꾸면 다시 신청해야 합니다. 허가는 근무처별입니다",
      ],
    },
    bring: {
      en: [
        "Passport and ARC",
        "Application form",
        "Employer's confirmation of employment",
        "Confirmation from your international office",
        "Transcript and certificate of enrolment",
      ],
      ko: [
        "여권, 외국인등록증",
        "통합신청서",
        "고용주 확인서",
        "국제처 확인서",
        "성적증명서, 재학증명서",
      ],
    },
    where: {
      en: "HiKorea online, or your local immigration office",
      ko: "하이코리아 또는 관할 출입국·외국인청",
    },
    timing: {
      en: "Before your first day, never after. How many hours a week you may work depends on your year of study and your Korean ability (TOPIK level), and the limits are different in term time and the holidays — your international office will tell you which limit is yours.",
      ko: "첫 근무 전에 받아야 합니다. 주당 허용 시간은 학년·한국어능력(TOPIK)에 따라 다르고 학기 중과 방학이 다릅니다. 본인 기준은 국제처에서 확인하세요.",
    },
    warning: {
      en: "Working without this permission is a status violation, not a small matter: fines for you, penalties for the employer, and it can block your next extension.",
      ko: "허가 없이 일하면 체류자격 위반입니다. 본인 범칙금, 고용주 처벌은 물론 다음 연장 심사에 불이익이 됩니다.",
    },
    sourceUrl: "https://www.hikorea.go.kr/Main.pt?locale=EN",
  },
  {
    id: "arc-reissue",
    title: {
      en: "Lost or damaged ARC",
      ko: "외국인등록증 재발급",
    },
    officialKo: "외국인등록증 재발급",
    keywords: [
      "lost",
      "lose",
      "stolen",
      "damaged",
      "broken",
      "replace",
      "reissue",
      "new card",
      "분실",
      "재발급",
      "잃어",
      "훼손",
    ],
    summary: {
      en: "Apply for a replacement card as soon as you notice. You are required to carry your ARC, so a lost card is not something to leave until the holidays.",
      ko: "분실을 알게 되는 즉시 재발급을 신청하세요. 외국인등록증은 휴대 의무가 있습니다.",
    },
    steps: {
      en: [
        "Apply for reissue (재발급) at your immigration office — book on HiKorea",
        "Take the receipt with you until the new card arrives; it stands in for the card",
        "If it was stolen, a police report helps but is not required",
      ],
      ko: [
        "하이코리아에서 예약 후 출입국사무소에서 재발급 신청",
        "새 카드가 나올 때까지 접수증을 소지하세요. 카드 대용이 됩니다",
        "도난이라면 경찰 신고서가 도움이 되지만 필수는 아닙니다",
      ],
    },
    bring: {
      en: [
        "Passport",
        "Application form",
        "One passport photo (3.5cm x 4.5cm)",
        "The damaged card, if you still have it",
      ],
      ko: [
        "여권",
        "통합신청서",
        "여권용 사진 1매 (3.5×4.5cm)",
        "훼손된 카드 (있는 경우)",
      ],
    },
    where: {
      en: "Local immigration office, by appointment",
      ko: "관할 출입국·외국인청 (방문예약)",
    },
    fee: { en: "KRW 30,000, cash", ko: "30,000원, 현금" },
    timing: {
      en: "The rule is to apply within 14 days of losing it or of the card being damaged.",
      ko: "분실·훼손일로부터 14일 이내에 신청해야 합니다.",
    },
    sourceUrl: "https://www.hikorea.go.kr/Main.pt?locale=EN",
  },
  {
    id: "re-entry",
    title: {
      en: "Leaving Korea and coming back",
      ko: "출국과 재입국",
    },
    officialKo: "재입국허가",
    keywords: [
      "travel",
      "leave korea",
      "go home",
      "flight",
      "abroad",
      "holiday",
      "vacation",
      "re-entry",
      "reentry",
      "come back",
      "재입국",
      "출국",
      "여행",
      "방학",
      "귀국",
    ],
    summary: {
      en: "If you hold a valid ARC and come back within one year — and before your stay expires — you do not need a re-entry permit. Going home for the holidays is fine.",
      ko: "유효한 외국인등록증이 있고 체류기간 내에 1년 이내로 돌아온다면 재입국허가가 따로 필요하지 않습니다.",
    },
    steps: {
      en: [
        "Check your ARC expiry: your trip must end before it, not after",
        "Carry your ARC with your passport — you need it to come back in",
        "If you will be away longer than a year, apply for a re-entry permit before you leave",
      ],
      ko: [
        "체류만료일을 확인하세요. 만료일 전에 돌아와야 합니다",
        "여권과 함께 외국인등록증을 꼭 소지하세요. 재입국 시 필요합니다",
        "1년을 넘겨 체류할 예정이라면 출국 전에 재입국허가를 받으세요",
      ],
    },
    bring: {
      en: ["Passport", "ARC"],
      ko: ["여권", "외국인등록증"],
    },
    where: {
      en: "No application needed for the usual case; otherwise HiKorea before departure",
      ko: "일반적인 경우 별도 신청 불필요. 그 외에는 출국 전 하이코리아 신청",
    },
    timing: {
      en: "Sort it out before you book, not at the airport.",
      ko: "항공권을 끊기 전에 확인하세요. 공항에서는 늦습니다.",
    },
    warning: {
      en: "If your stay expires while you are away, the ARC does not let you back in — extend first, travel after.",
      ko: "해외에 있는 동안 체류기간이 만료되면 재입국할 수 없습니다. 연장을 먼저 하고 출국하세요.",
    },
    sourceUrl: "https://www.hikorea.go.kr/Main.pt?locale=EN",
  },
  {
    id: "leave-of-absence",
    title: {
      en: "Taking a semester off (leave of absence)",
      ko: "휴학과 체류자격",
    },
    officialKo: "휴학",
    keywords: [
      "leave of absence",
      "take a break",
      "semester off",
      "drop out",
      "quit",
      "stop studying",
      "휴학",
      "자퇴",
      "학업중단",
    ],
    summary: {
      en: "A leave of absence is an academic decision with an immigration consequence: a D-2 visa exists because you are studying. The university reports enrolment changes to immigration.",
      ko: "휴학은 학사 결정이지만 체류자격에 영향을 줍니다. D-2는 재학을 전제로 하며 학교는 학적 변동을 출입국에 통보합니다.",
    },
    steps: {
      en: [
        "Talk to your international office before you file, not after",
        "Ask them what happens to your stay: usually you are expected to leave Korea for the period, or to change status",
        "Check the academic deadline for filing separately — it is not the same date",
      ],
      ko: [
        "신청 전에 먼저 국제처와 상담하세요",
        "휴학 기간 중 체류 처리 방법(출국 또는 자격변경)을 확인하세요",
        "학사 일정상 휴학 신청 기한은 별도이므로 따로 확인하세요",
      ],
    },
    bring: {
      en: ["Your student ID", "Whatever the international office asks for"],
      ko: ["학생증", "국제처 안내 서류"],
    },
    where: {
      en: "Your university's international office",
      ko: "소속 대학 국제처",
    },
    timing: {
      en: "Before the university's filing deadline, and before you book any flight.",
      ko: "학사 일정상 휴학 신청 기한 전, 그리고 항공권 예약 전에 확인하세요.",
    },
    sourceUrl: "https://www.hikorea.go.kr/Main.pt?locale=EN",
  },
  {
    id: "bank-and-phone",
    title: {
      en: "Bank account and phone number",
      ko: "은행 계좌와 휴대폰 개통",
    },
    officialKo: "은행 계좌 개설",
    keywords: [
      "bank",
      "account",
      "card",
      "money",
      "transfer",
      "phone",
      "sim",
      "number",
      "mobile",
      "은행",
      "계좌",
      "체크카드",
      "휴대폰",
      "유심",
      "개통",
    ],
    summary: {
      en: "Both normally wait on your ARC. Until it arrives, a prepaid SIM works with just your passport, and most banks will open a limited account.",
      ko: "둘 다 보통 외국인등록증이 나온 뒤에 가능합니다. 그 전에는 여권만으로 선불 유심을 쓸 수 있고, 일부 은행은 한도 계좌를 열어줍니다.",
    },
    steps: {
      en: [
        "Get a prepaid SIM on your passport when you land",
        "Open the bank account once your ARC is issued — take it, your passport and your certificate of enrolment",
        "Move to a monthly phone plan after the account exists, since it is paid by direct debit",
      ],
      ko: [
        "입국 직후에는 여권으로 선불 유심을 개통하세요",
        "외국인등록증이 나오면 여권·재학증명서와 함께 은행에 방문해 계좌를 개설하세요",
        "계좌가 생긴 뒤 후불 요금제로 전환하세요. 자동이체가 필요합니다",
      ],
    },
    bring: {
      en: ["ARC", "Passport", "Certificate of enrolment", "Your address"],
      ko: ["외국인등록증", "여권", "재학증명서", "체류지 주소"],
    },
    where: {
      en: "Any bank branch near campus; phone shops anywhere",
      ko: "학교 인근 은행 지점, 통신사 대리점",
    },
    timing: {
      en: "After your ARC arrives. New accounts often have a daily transfer limit for the first months — that is normal, not a mistake.",
      ko: "외국인등록증 발급 후. 신규 계좌는 몇 달간 이체 한도가 있을 수 있으며 정상입니다.",
    },
    sourceUrl: "https://www.hikorea.go.kr/Main.pt?locale=EN",
  },
];

export function guideById(id: string): Guide | undefined {
  return GUIDES.find((guide) => guide.id === id);
}

/**
 * The guide a question is about, by keyword. Deliberately simple: it only
 * decides which written text is put in front of the model, and what the panel
 * falls back to when there is no model to call.
 */
export function findGuide(question: string): Guide | null {
  const text = question.toLowerCase();
  let best: { guide: Guide; score: number } | null = null;
  for (const guide of GUIDES) {
    let score = 0;
    for (const keyword of guide.keywords) {
      if (text.includes(keyword)) score += keyword.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { guide, score };
  }
  return best?.guide ?? null;
}

/** The written guide, laid out as an answer. Used when no model answered. */
export function composeGuideAnswer(guide: Guide, language: Language): string {
  const lines = [
    `${pick(guide.title, language)} (${guide.officialKo})`,
    "",
    pick(guide.summary, language),
    "",
    language === "ko" ? "언제" : "When",
    pick(guide.timing, language),
    "",
    language === "ko" ? "어떻게" : "How",
    ...pickList(guide.steps, language).map(
      (step, index) => `${index + 1}. ${step}`,
    ),
    "",
    language === "ko" ? "준비물" : "Bring",
    pickList(guide.bring, language).join(", "),
    "",
    `${language === "ko" ? "장소" : "Where"}: ${pick(guide.where, language)}`,
  ];
  if (guide.fee) {
    lines.push(
      `${language === "ko" ? "비용" : "Cost"}: ${pick(guide.fee, language)}`,
    );
  }
  if (guide.warning) {
    lines.push("", pick(guide.warning, language));
  }
  return lines.join("\n");
}

/** What a student can read for themselves after an answer. */
export function sourcesFor(
  guide: Guide | null,
  item: RequirementState | null,
  language: Language,
): AssistantSource[] {
  const sources: AssistantSource[] = [];
  if (item) {
    sources.push({
      label: `${item.title} (${item.officialKo})`,
      url: item.sourceUrl,
    });
  }
  if (guide) {
    sources.push({
      label: `${pick(guide.title, language)} (${guide.officialKo})`,
      url: guide.sourceUrl,
    });
  }
  if (sources.length === 0) {
    sources.push({
      label: language === "ko" ? "하이코리아" : "HiKorea (immigration)",
      url: HELP.hikorea,
    });
  }
  return sources;
}

/**
 * The questions worth offering before the student types anything. Tied to the
 * row they opened this from when there is one, because that is what they were
 * looking at when they got stuck.
 */
export function suggestedQuestions(
  language: Language,
  item: RequirementState | null,
): string[] {
  if (item) {
    return language === "ko"
      ? [
          `${item.officialKo}, 무엇부터 해야 하나요?`,
          "준비물 중에 빠진 게 있으면 어떻게 되나요?",
          "이 기한을 놓치면 어떻게 되나요?",
          "예약은 어떻게 하나요?",
        ]
      : [
          `What do I do first for ${item.title}?`,
          "What happens if I am missing one of the documents?",
          "What happens if I miss this deadline?",
          "How do I book the appointment?",
        ];
  }
  return language === "ko"
    ? [
        "체류기간은 어떻게 연장하나요?",
        "아르바이트를 하려면 무엇이 필요한가요?",
        "외국인등록증을 잃어버렸어요",
        "방학에 출국해도 되나요?",
      ]
    : [
        "How do I extend my visa?",
        "What do I need in order to work part-time?",
        "I lost my ARC — what now?",
        "Can I travel home during the holidays?",
      ];
}

/**
 * The question as it is posted into the chat for ALF, with the facts attached.
 *
 * ALF is a good answerer and a poor guesser: asked "how do I extend my visa"
 * in the abstract it will describe the procedure in general, which is the
 * answer the student could already have found. Asked the same question with
 * this student's arrival date, the row they were looking at, what is already
 * overdue and the official wording, it answers about them. So the panel never
 * sends the bare question — it sends the question plus the part of the
 * checklist that makes it answerable, and the source, so whoever replies,
 * ALF or a person, is working from the same page the student is.
 */
export function composeAlfQuestion(input: {
  question: string;
  /** The row the question was asked from, when there was one. */
  item: RequirementState | null;
  /** The written guide the question matched, when it matched one. */
  guide: Guide | null;
  /** The student's whole checklist, for the few lines of context. */
  items: RequirementState[];
  profile: StudentProfile;
  today: string;
  language: Language;
}): string {
  const { item, guide, items, profile, language } = input;
  const ko = language === "ko";

  const outstanding = items
    .filter((candidate) => candidate.status !== "done")
    .slice(0, 3);

  const lines: string[] = [`❓ ${input.question.trim()}`, ""];

  lines.push(
    ko
      ? `내 상황 (${input.today} 기준)`
      : `My situation (as of ${input.today})`,
  );
  const semester = ko
    ? { first: "1학기", second: "2학기", later: "3학기 이상" }[profile.semester]
    : {
        first: "first semester",
        second: "second semester",
        later: "later in the degree",
      }[profile.semester];

  lines.push(
    ko
      ? `• ${profile.isInternational ? "외국인 유학생" : "국내 학생"} · ${profile.living === "dorm" ? "기숙사" : "통학"} · ${semester}`
      : `• ${profile.isInternational ? "International student" : "Domestic student"} · ${profile.living === "dorm" ? "dormitory" : "commuting"} · ${semester}`,
  );

  const timing = (state: RequirementState): string =>
    state.daysLeft < 0
      ? ko
        ? `${Math.abs(state.daysLeft)}일 지남`
        : `${Math.abs(state.daysLeft)} days overdue`
      : ko
        ? `${state.daysLeft}일 남음`
        : `${state.daysLeft} days left`;

  if (item) {
    lines.push(
      ko
        ? `• ${item.title} (${item.officialKo}) — 마감 ${item.dueDate}, ${timing(item)}`
        : `• ${item.title} (${item.officialKo}) — due ${item.dueDate}, ${timing(item)}`,
      ko
        ? `• 준비물: ${item.bring.join(", ")}`
        : `• Bring: ${item.bring.join(", ")}`,
      ko ? `• 장소: ${item.where}` : `• Where: ${item.where}`,
    );
  } else {
    for (const state of outstanding) {
      lines.push(
        `• ${state.title} (${state.officialKo}) — ${state.dueDate}, ${timing(state)}`,
      );
    }
  }

  if (guide) {
    lines.push(
      "",
      ko
        ? `관련 절차: ${pick(guide.title, "ko")} (${guide.officialKo})`
        : `Related procedure: ${pick(guide.title, "en")} (${guide.officialKo})`,
      pick(guide.timing, language),
    );
  }

  const source = item?.sourceUrl ?? guide?.sourceUrl ?? HELP.hikorea;
  lines.push("", ko ? `출처: ${source}` : `Source: ${source}`);

  return lines.join("\n");
}
