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

export interface Requirement {
  id: string;
  title: string;
  titleKo: string;
  scope: RequirementScope;
  anchor: RequirementAnchor;
  /** Days after arrival, for anchor "arrival". */
  dueWithinDays?: number;
  /** Published calendar date (YYYY-MM-DD), for anchor "fixed". */
  dueDate?: string;
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
  // --- Korean immigration law: the same at every university ---
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
    where: "Local immigration office — book a slot on HiKorea first",
    fee: "KRW 30,000, cash only",
    sourceUrl:
      "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=176&PARENT_ID=139",
    national: true,
    audience: "international",
    recovery: [
      "Book the earliest HiKorea slot you can get — the delay is what is penalised, so do this before assembling documents",
      "Bring a written explanation (사유서) of why you are late",
      "Bring the fee in cash; cards are not accepted",
    ],
  },
  {
    id: "address-report",
    title: "Report your address within 15 days of moving in",
    titleKo: "체류지 변경 신고 (전입 후 15일 이내)",
    scope: "immigration",
    anchor: "arrival",
    dueWithinDays: 15,
    bring: [
      "Passport",
      "ARC (if already issued)",
      "Lease or dormitory contract",
    ],
    where: "Local immigration office, or the district office (주민센터)",
    sourceUrl:
      "https://www.hikorea.go.kr/info/InfoDatail.pt?CAT_SEQ=180&PARENT_ID=139",
    national: true,
    audience: "international",
    recovery: [
      "Report it now — the clock runs from the day you moved, not from today",
      "The district office (주민센터) is usually faster than immigration for this",
    ],
  },
  {
    id: "enrolment-certificate",
    title: "Get your certificate of enrolment (재학증명서)",
    titleKo: "재학증명서 발급",
    scope: "academic",
    anchor: "arrival",
    dueWithinDays: 60,
    bring: ["Your SKKU portal login"],
    where: "Online at icert.skku.edu, any time",
    fee: "KRW 500 printed, KRW 750 electronic",
    sourceUrl: "https://icert.skku.edu",
    national: false,
    audience: "international",
    recovery: [
      "This one is issued online in minutes, so it is never too late",
      "Get it before your immigration appointment — the ARC application needs it",
    ],
  },

  // --- SKKU 2026 Fall semester: published calendar dates ---
  {
    id: "tuition-payment",
    title: "Pay tuition for the Fall semester",
    titleKo: "등록금 납부",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-08-27",
    bring: ["Tuition invoice from the portal", "Your bank details"],
    where: "Designated bank, or the SKKU portal",
    sourceUrl: "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do",
    national: false,
    audience: "all",
    recovery: [
      "There is a supplementary registration period (추가 등록): 31 Aug – 4 Sep",
      "If that has also passed, contact the academic affairs team before the semester ends — unpaid registration puts your enrolment at risk",
    ],
  },
  {
    id: "course-registration",
    title: "Register for courses",
    titleKo: "수강신청",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-08-18",
    bring: ["Your Kingo ID"],
    where: "SKKU course registration system",
    sourceUrl:
      "https://www.skku.edu/skku/campus/skk_comm/notice02.do?mode=view&articleNo=131774",
    national: false,
    audience: "all",
    recovery: [
      "The add & drop period (수강신청 확인·변경) runs 31 Aug – 5 Sep and is the normal way to fix a missed registration",
      "Exchange students are excluded from pre-registration and use the first-come-first-served round instead",
    ],
  },
  {
    id: "course-add-drop",
    title: "Confirm or change your courses",
    titleKo: "수강신청 확인·변경",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-09-05",
    bring: ["Your Kingo ID"],
    where: "SKKU course registration system",
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    recovery: [
      "After this closes, withdrawal (수강철회) is the remaining route, and that window is short",
      "Check your registered courses now — an accidental registration still counts toward your grade",
    ],
  },
  {
    id: "credit-deletion",
    title: "Apply to delete credits (학점포기)",
    titleKo: "학점포기 신청",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-09-11",
    bring: ["Your Kingo ID"],
    where: "SKKU portal",
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    recovery: [
      "This is separate from course withdrawal and closes earlier — check which one you actually needed",
      "Ask your department office what remains available for the course in question",
    ],
  },
  {
    id: "course-withdrawal",
    title: "Withdraw from a course (수강철회)",
    titleKo: "수강철회 신청",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-09-18",
    bring: [
      "Your Kingo ID",
      "Advisor approval, if your department requires it",
    ],
    where: "SKKU portal",
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    recovery: [
      "Withdrawal for this semester has closed — the course now stays on your record and will be graded",
      "Midterms run 19–23 Oct, so there is still time to recover the grade rather than the registration",
      "Ask your department office whether retaking the course later is possible for your programme",
    ],
  },
  {
    id: "midterm-exams",
    title: "Midterm examinations",
    titleKo: "중간시험",
    scope: "academic",
    anchor: "fixed",
    dueDate: "2026-10-19",
    bring: ["Student ID"],
    where: "Your course classrooms",
    sourceUrl:
      "https://www.skku.edu/eng/edu/bachelor/ca_de_schedule.do?srBachelorYear=2026",
    national: false,
    audience: "all",
    recovery: [
      "If you missed an exam through illness, ask the course office about a make-up (추가시험) immediately — these are time-limited",
    ],
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
  const today = parseIsoDate(input.today);
  if (arrival === null || today === null) return [];

  const completed = new Set(input.completed);

  const profile = input.profile;
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
