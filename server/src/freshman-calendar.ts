type FreshmanProfile = {
  major: string;
  semester: "first";
  international: boolean;
  living: "dormitory" | "commuter";
  age: number;
};

type FreshmanAnnouncement = {
  title: string;
  date: string;
  action: string;
  tags: string[];
  reason: (profile: FreshmanProfile) => string | undefined;
};

export const demoFreshmanProfile = {
  major: "Computer Science",
  semester: "first",
  international: true,
  living: "dormitory",
  age: 18,
} satisfies FreshmanProfile;

const freshmanAnnouncements = [
  {
    title: "Visa / immigration document check",
    date: "Sep 23",
    action: "Prepare passport, ARC documents, and enrollment certificate.",
    tags: ["international", "deadline"],
    reason: (profile) =>
      profile.international
        ? "You are an international freshman, so immigration deadlines can affect your school registration."
        : undefined,
  },
  {
    title: "Dormitory safety orientation",
    date: "Sep 25",
    action: "Attend the dorm session or confirm completion online.",
    tags: ["dormitory", "required"],
    reason: (profile) =>
      profile.living === "dormitory"
        ? "You live in the dormitory, so this notice applies to your housing status."
        : undefined,
  },
  {
    title: "Computer Science freshman orientation",
    date: "Sep 30",
    action: "Check the room number and bring your student ID.",
    tags: ["computer science", "first-semester"],
    reason: (profile) =>
      profile.major === "Computer Science" && profile.semester === "first"
        ? "You are a first-semester Computer Science student, so this major orientation is relevant."
        : undefined,
  },
  {
    title: "Course add/drop final reminder",
    date: "Oct 2",
    action: "Review your timetable before the deadline.",
    tags: ["first-semester", "deadline"],
    reason: (profile) =>
      profile.semester === "first"
        ? "First-semester students often need extra reminders before their first add/drop deadline."
        : undefined,
  },
  {
    title: "Student health check reservation",
    date: "Oct 4",
    action: "Book a campus clinic time if you have not completed it.",
    tags: ["freshman", "health"],
    reason: (profile) =>
      profile.age <= 19
        ? "This is commonly required for younger incoming freshmen."
        : undefined,
  },
] satisfies FreshmanAnnouncement[];

export function getRelevantFreshmanAnnouncements(
  profile: FreshmanProfile = demoFreshmanProfile,
) {
  return freshmanAnnouncements
    .map((announcement) => ({
      ...announcement,
      why: announcement.reason(profile),
    }))
    .filter((announcement) => announcement.why)
    .slice(0, 3);
}

export function formatFreshmanCalendarMessage(
  profile: FreshmanProfile = demoFreshmanProfile,
) {
  const announcements = getRelevantFreshmanAnnouncements(profile);
  const lines = [
    "Freshman calendar: 3 things that matter to you right now",
    "",
    `Profile: ${profile.major}, first semester, ${
      profile.international ? "international" : "domestic"
    }, ${profile.living}, age ${profile.age}`,
    "",
    ...announcements.flatMap((announcement, index) => [
      `${index + 1}. ${announcement.date} - ${announcement.title}`,
      `Why: ${announcement.why}`,
      `Next: ${announcement.action}`,
      "",
    ]),
    "This is personalized from the freshman profile, not a general announcement list.",
  ];

  return lines.join("\n").trim();
}
