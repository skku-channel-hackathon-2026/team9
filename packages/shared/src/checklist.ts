import { z } from "zod";

/** Where a requirement comes from. National rules apply at every Korean university. */
export type RequirementScope = "immigration" | "academic" | "life";

/** What a deadline is counted from. */
export type RequirementAnchor = "arrival" | "semester";

/** Who a requirement actually applies to, so nobody reads irrelevant rows. */
export type RequirementAudience = "all" | "international" | "domestic";

export interface Requirement {
  id: string;
  title: string;
  titleKo: string;
  scope: RequirementScope;
  anchor: RequirementAnchor;
  /** Days after the anchor date by which this must be done. */
  dueWithinDays: number;
  /** Documents to bring. */
  bring: string[];
  where: string;
  fee?: string;
  /** Official page this rule comes from, shown as a citation. */
  sourceUrl: string;
  /** National rules are verified law; school rules vary per university. */
  national: boolean;
  audience: RequirementAudience;
  /**
   * What to do once this has already been missed. Telling a student they are
   * late without telling them how to fix it is worse than saying nothing.
   */
  recovery: string[];
  /** What being late actually costs, when that is a published figure. */
  penalty?: string;
}

/**
 * National rules are Korean immigration requirements and are the same at every
 * university. Seeded rules stand in for one school's published dates.
 */
export const REQUIREMENTS: Requirement[] = [
  {
    id: "arc-registration",
    title: "Register your Alien Registration Card (ARC)",
    titleKo: "외국인등록 (ARC) 신청",
    scope: "immigration",
    anchor: "arrival",
    dueWithinDays: 90,
    bring: [
      "Passport",
      "Application form",
      "One passport photo (3.5cm x 4.5cm)",
      "Certificate of enrolment (재학증명서)",
      "Proof of address",
    ],
    where: "Local immigration office (book on HiKorea)",
    fee: "KRW 30,000",
    sourceUrl:
      "https://yiec.yonsei.ac.kr/yiec_en/info/foreigners_registration.do",
    national: true,
    audience: "international",
    recovery: [],
  },
  {
    id: "enrolment-certificate",
    title: "Collect your certificate of enrolment",
    titleKo: "재학증명서 발급",
    scope: "academic",
    anchor: "arrival",
    dueWithinDays: 60,
    bring: ["Student ID"],
    where: "International office or the certificate kiosk",
    sourceUrl: "https://neweng.cau.ac.kr/cms/FR_CON/index.do?MENU_ID=460",
    national: false,
    audience: "all",
    recovery: [],
  },
  {
    id: "address-report",
    title: "Report your address after moving",
    titleKo: "체류지 변경 신고",
    scope: "immigration",
    anchor: "arrival",
    dueWithinDays: 104,
    bring: ["Passport", "ARC", "Lease or dormitory contract"],
    where: "Immigration office or the local district office",
    sourceUrl: "https://www.junggu.seoul.kr/english/content.do?cmsid=14873",
    national: true,
    audience: "international",
    recovery: [],
  },
  {
    id: "health-insurance",
    title: "Confirm national health insurance enrolment",
    titleKo: "국민건강보험 가입 확인",
    scope: "life",
    anchor: "arrival",
    dueWithinDays: 180,
    bring: ["ARC"],
    where: "NHIS branch office",
    sourceUrl: "https://www.junggu.seoul.kr/english/content.do?cmsid=14873",
    national: true,
    audience: "international",
    recovery: [],
  },
  {
    id: "tuition-payment",
    title: "Pay the tuition instalment",
    titleKo: "등록금 납부",
    scope: "academic",
    anchor: "semester",
    dueWithinDays: 21,
    bring: ["Tuition invoice", "Bank account"],
    where: "Designated bank or the student portal",
    sourceUrl: "https://neweng.cau.ac.kr/cms/FR_CON/index.do?MENU_ID=460",
    national: false,
    audience: "all",
    recovery: [],
  },
  {
    id: "course-withdrawal",
    title: "Decide on course withdrawal",
    titleKo: "수강철회 신청",
    scope: "academic",
    anchor: "semester",
    dueWithinDays: 35,
    bring: ["Advisor approval, if your department requires it"],
    where: "Student portal",
    sourceUrl: "https://neweng.cau.ac.kr/cms/FR_CON/index.do?MENU_ID=460",
    national: false,
    audience: "all",
    recovery: [],
  },
];

export type RequirementStatus =
  "done" | "overdue" | "urgent" | "soon" | "later";

export interface RequirementState {
  id: string;
  title: string;
  titleKo: string;
  scope: RequirementScope;
  bring: string[];
  where: string;
  fee?: string;
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
}

export const StudentProfileSchema = z.object({
  isInternational: z.boolean(),
});

export function appliesTo(
  requirement: Requirement,
  profile: StudentProfile,
): boolean {
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
  const semester = parseIsoDate(input.semesterStart);
  const today = parseIsoDate(input.today);
  if (arrival === null || semester === null || today === null) return [];

  const completed = new Set(input.completed);

  const profile = input.profile;
  const applicable = profile
    ? REQUIREMENTS.filter((requirement) => appliesTo(requirement, profile))
    : REQUIREMENTS;

  const states = applicable.map((requirement) => {
    const anchor = requirement.anchor === "arrival" ? arrival : semester;
    const due = addDays(anchor, requirement.dueWithinDays);
    const daysLeft = daysBetween(today, due);
    const done = completed.has(requirement.id);
    return {
      id: requirement.id,
      title: requirement.title,
      titleKo: requirement.titleKo,
      scope: requirement.scope,
      bring: requirement.bring,
      where: requirement.where,
      fee: requirement.fee,
      sourceUrl: requirement.sourceUrl,
      national: requirement.national,
      recovery: requirement.recovery,
      penalty: requirement.penalty,
      dueDate: toIsoDate(due),
      daysLeft,
      status: statusFor(daysLeft, done),
    } satisfies RequirementState;
  });

  return states.sort((left, right) => {
    const leftDone = left.status === "done" ? 1 : 0;
    const rightDone = right.status === "done" ? 1 : 0;
    if (leftDone !== rightDone) return leftDone - rightDone;
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
});

export type StoredProgress = z.infer<typeof StoredProgressSchema>;

export const RequirementStateSchema = z.object({
  id: z.string(),
  title: z.string(),
  titleKo: z.string(),
  scope: z.enum(["immigration", "academic", "life"]),
  bring: z.array(z.string()),
  where: z.string(),
  fee: z.string().optional(),
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
  /** False when D1 is unavailable, so the UI can explain why ticks won't stick. */
  canSave: z.boolean(),
});

export type ChecklistWamArgs = z.infer<typeof ChecklistWamArgsSchema>;

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
  };
}
