import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildChecklist,
  composeAlfQuestion,
  composeGuideAnswer,
  findGuide,
  GUIDES,
  sourcesFor,
  suggestedQuestions,
  type StudentProfile,
} from "@tutorial/shared";

const PROFILE: StudentProfile = {
  isInternational: true,
  living: "dorm",
  university: "skku",
};

const TODAY = "2026-09-19";

const ITEMS = buildChecklist({
  arrivalDate: "2026-08-20",
  semesterStart: "2026-08-20",
  completed: [],
  today: TODAY,
  profile: PROFILE,
});

test("routes a visa question to the extension guide", () => {
  const guide = findGuide("how do i extend my visa before it expires?");
  assert.equal(guide?.id, "visa-extension");
});

test("routes the same question asked in Korean", () => {
  const guide = findGuide("체류기간 연장은 어떻게 하나요?");
  assert.equal(guide?.id, "visa-extension");
});

test("routes a part-time work question to the work permit guide", () => {
  assert.equal(findGuide("can I get a part-time job?")?.id, "work-permit");
  assert.equal(findGuide("아르바이트 하고 싶어요")?.id, "work-permit");
});

test("does not invent a guide for an unrelated question", () => {
  assert.equal(findGuide("where is the nearest library"), null);
});

test("every guide answer names the procedure in Korean and cites a source", () => {
  for (const guide of GUIDES) {
    const answer = composeGuideAnswer(guide, "en");
    assert.ok(
      answer.includes(guide.officialKo),
      `${guide.id} should carry its Korean name`,
    );
    assert.ok(
      guide.sourceUrl.startsWith("https://"),
      `${guide.id} needs a source`,
    );
    assert.ok(composeGuideAnswer(guide, "ko").length > 0);
  }
});

test("the question posted for ALF carries this student's own dates", () => {
  const arc = ITEMS.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  const message = composeAlfQuestion({
    question: "Do I extend my visa before or after this?",
    item: arc,
    guide: findGuide("extend my visa"),
    items: ITEMS,
    profile: PROFILE,
    today: TODAY,
    language: "en",
  });

  assert.ok(message.startsWith("❓ Do I extend my visa"));
  // The point of the hand-off: ALF reads the dates, not just the question.
  assert.ok(message.includes(arc.dueDate));
  assert.ok(message.includes(arc.officialKo));
  assert.ok(message.includes(`${arc.daysLeft} days left`));
  assert.ok(message.includes("체류기간 연장허가"));
  assert.ok(message.includes(TODAY));
  assert.ok(message.includes("https://"));
});

test("says how late an overdue item is, not just that it is late", () => {
  const late = buildChecklist({
    arrivalDate: "2026-01-05",
    semesterStart: "2026-01-05",
    completed: [],
    today: TODAY,
    profile: PROFILE,
  });
  const overdue = late.find((item) => item.status === "overdue");
  assert.ok(overdue);

  const message = composeAlfQuestion({
    question: "What do I do now?",
    item: overdue,
    guide: null,
    items: late,
    profile: PROFILE,
    today: TODAY,
    language: "en",
  });
  assert.ok(message.includes(`${Math.abs(overdue.daysLeft)} days overdue`));
});

test("without a row, the message leads with what is still outstanding", () => {
  const message = composeAlfQuestion({
    question: "What should I do first?",
    item: null,
    guide: null,
    items: ITEMS,
    profile: PROFILE,
    today: TODAY,
    language: "en",
  });
  const first = ITEMS.find((item) => item.status !== "done");
  assert.ok(first);
  assert.ok(message.includes(first.title));
});

test("a domestic student's question is composed in Korean", () => {
  const profile: StudentProfile = { ...PROFILE, isInternational: false };
  const items = buildChecklist({
    arrivalDate: "2026-08-20",
    semesterStart: "2026-08-20",
    completed: [],
    today: TODAY,
    profile,
  });
  const message = composeAlfQuestion({
    question: "등록금은 언제까지인가요?",
    item: items[0] ?? null,
    guide: null,
    items,
    profile,
    today: TODAY,
    language: "ko",
  });
  assert.ok(message.includes("내 상황"));
  assert.ok(message.includes("국내 학생"));
});

test("always offers somewhere to read for yourself", () => {
  const withNothing = sourcesFor(null, null, "en");
  assert.equal(withNothing.length, 1);
  assert.ok(withNothing[0]?.url.includes("hikorea"));

  const arc = ITEMS.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  const withBoth = sourcesFor(findGuide("visa extension"), arc, "en");
  assert.equal(withBoth.length, 2);
});

test("suggests questions about the row a student opened", () => {
  const arc = ITEMS.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  const suggestions = suggestedQuestions("en", arc);
  assert.ok(suggestions.some((question) => question.includes(arc.title)));
  assert.ok(suggestedQuestions("ko", null).length > 0);
});
