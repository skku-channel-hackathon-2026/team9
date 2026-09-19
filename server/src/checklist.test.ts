import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildChecklist,
  calendarUrl,
  composeQuestion,
  defaultProgress,
  daysBetween,
  nextAction,
  parseIsoDate,
  statusFor,
} from "@tutorial/shared";

const BASE = {
  arrivalDate: "2026-03-02",
  semesterStart: "2026-03-02",
  completed: [] as string[],
};

test("counts the ARC deadline 90 days from arrival", () => {
  const items = buildChecklist({ ...BASE, today: "2026-03-02" });
  const arc = items.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  assert.equal(arc.dueDate, "2026-05-31");
  assert.equal(arc.daysLeft, 90);
});

test("marks a passed deadline as overdue", () => {
  const items = buildChecklist({ ...BASE, today: "2026-06-05" });
  const arc = items.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  assert.equal(arc.status, "overdue");
  assert.ok(arc.daysLeft < 0);
});

test("escalates to urgent inside the final week", () => {
  const items = buildChecklist({ ...BASE, today: "2026-05-28" });
  const arc = items.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  assert.equal(arc.daysLeft, 3);
  assert.equal(arc.status, "urgent");
});

test("completed requirements sink below outstanding ones", () => {
  const items = buildChecklist({
    ...BASE,
    completed: ["arc-registration"],
    today: "2026-03-02",
  });
  const arc = items.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  assert.equal(arc.status, "done");
  assert.notEqual(items[0]?.id, "arc-registration");
});

test("leads with the most urgent outstanding requirement", () => {
  const items = buildChecklist({ ...BASE, today: "2026-04-20" });
  const next = nextAction(items);
  assert.ok(next);
  assert.notEqual(next.status, "done");
  assert.equal(next.id, items[0]?.id);
});

test("returns nothing when every requirement is complete", () => {
  const all = buildChecklist({ ...BASE, today: "2026-03-02" }).map(
    (item) => item.id,
  );
  const items = buildChecklist({
    ...BASE,
    completed: all,
    today: "2026-03-02",
  });
  assert.equal(nextAction(items), null);
});

test("rejects malformed dates instead of inventing deadlines", () => {
  assert.equal(parseIsoDate("2026-3-2"), null);
  assert.equal(parseIsoDate("not-a-date"), null);
  assert.deepEqual(buildChecklist({ ...BASE, today: "nope" }), []);
});

test("every requirement carries a citation and instructions", () => {
  for (const item of buildChecklist({ ...BASE, today: "2026-03-02" })) {
    assert.match(item.sourceUrl, /^https:\/\//);
    assert.ok(item.bring.length > 0, `${item.id} lists no documents`);
    assert.ok(item.where.length > 0, `${item.id} has no location`);
  }
});

test("day arithmetic stays whole across a DST-free UTC span", () => {
  const from = parseIsoDate("2026-03-02");
  const to = parseIsoDate("2026-05-31");
  assert.ok(from !== null && to !== null);
  assert.equal(daysBetween(from, to), 90);
});

test("done overrides an overdue date", () => {
  assert.equal(statusFor(-5, true), "done");
  assert.equal(statusFor(-5, false), "overdue");
});

test("defaults to a recent arrival so the list is not all overdue", () => {
  const progress = defaultProgress("2026-09-19");
  assert.equal(progress.arrivalDate, "2026-08-20");
  assert.deepEqual(progress.completed, []);

  const items = buildChecklist({ ...progress, today: "2026-09-19" });
  const statuses = new Set(items.map((item) => item.status));
  assert.ok(items.length > 0);
  assert.ok(
    statuses.size > 1,
    `expected a mix of statuses, got ${[...statuses].join(", ")}`,
  );
  assert.ok(
    items.some((item) => item.daysLeft > 0),
    "at least one requirement should still be ahead of the student",
  );
});

test("a malformed today still yields a usable default", () => {
  const progress = defaultProgress("nope");
  assert.equal(progress.arrivalDate, "nope");
  assert.deepEqual(progress.completed, []);
});

test("a domestic student is not shown immigration requirements", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-03-02",
    profile: {
      isInternational: false,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  assert.ok(items.length > 0);
  assert.ok(
    items.every((item) => item.scope !== "immigration"),
    "immigration rows leaked to a domestic student",
  );
});

test("each audience sees requirements the other does not", () => {
  const international = buildChecklist({
    ...BASE,
    today: "2026-03-02",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const domestic = buildChecklist({
    ...BASE,
    today: "2026-03-02",
    profile: {
      isInternational: false,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const intlIds = new Set(international.map((item) => item.id));
  const domesticIds = new Set(domestic.map((item) => item.id));

  assert.ok(
    [...intlIds].some((id) => !domesticIds.has(id)),
    "nothing applies only to international students",
  );
  assert.ok(
    [...domesticIds].some((id) => !intlIds.has(id)),
    "nothing applies only to domestic students",
  );
  assert.ok(
    [...intlIds].some((id) => domesticIds.has(id)),
    "the two audiences share nothing at all, which cannot be right",
  );
});

test("omitting a profile filters nothing out", () => {
  const all = buildChecklist({ ...BASE, today: "2026-03-02" });
  for (const isInternational of [true, false]) {
    for (const living of ["dorm", "commuter"] as const) {
      const filtered = buildChecklist({
        ...BASE,
        today: "2026-03-02",
        profile: {
          isInternational,
          living,
          university: "skku",
          semester: "first",
        },
      });
      assert.ok(
        filtered.length <= all.length,
        "a filtered list was longer than the unfiltered one",
      );
      for (const item of filtered) {
        assert.ok(
          all.some((candidate) => candidate.id === item.id),
          `${item.id} appears when filtered but not when unfiltered`,
        );
      }
    }
  }
});

test("every requirement carries recovery steps for being late", () => {
  const items = buildChecklist({ ...BASE, today: "2026-03-02" });
  for (const item of items) {
    assert.ok(Array.isArray(item.recovery), `${item.id} has no recovery array`);
  }
});

test("the most recently missed requirement leads, not the oldest", () => {
  const items = buildChecklist({ ...BASE, today: "2026-09-19" });
  const overdue = items.filter((item) => item.status === "overdue");
  assert.ok(overdue.length > 1, "expected several missed requirements");
  for (let i = 1; i < overdue.length; i += 1) {
    assert.ok(
      overdue[i - 1].daysLeft >= overdue[i].daysLeft,
      "a longer-missed requirement was listed above a more recent one",
    );
  }
  assert.equal(items[0].id, overdue[0].id);
});

test("missed requirements come before upcoming ones", () => {
  const items = buildChecklist({ ...BASE, today: "2026-09-19" });
  const firstUpcoming = items.findIndex((item) => item.daysLeft >= 0);
  const lastOverdue = items.map((i) => i.status).lastIndexOf("overdue");
  if (firstUpcoming !== -1 && lastOverdue !== -1) {
    assert.ok(lastOverdue < firstUpcoming);
  }
});

test("published calendar dates are used verbatim, not derived", () => {
  const items = buildChecklist({
    arrivalDate: "2026-01-01",
    semesterStart: "2026-01-01",
    completed: [],
    today: "2026-09-19",
  });
  const withdrawal = items.find((item) => item.id === "course-withdrawal");
  assert.ok(withdrawal);
  assert.equal(withdrawal.dueDate, "2026-09-18");

  const shifted = buildChecklist({
    arrivalDate: "2026-06-15",
    semesterStart: "2026-06-15",
    completed: [],
    today: "2026-09-19",
  });
  assert.equal(
    shifted.find((item) => item.id === "course-withdrawal")?.dueDate,
    "2026-09-18",
    "a university deadline moved when the student's arrival date changed",
  );
});

test("a missed requirement explains how to recover", () => {
  const items = buildChecklist({ ...BASE, today: "2026-09-19" });
  for (const item of items.filter((i) => i.status === "overdue")) {
    assert.ok(
      item.recovery.length > 0,
      `${item.id} is overdue but offers no way to recover`,
    );
  }
});

test("a domestic student reads the checklist in Korean", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: false,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const withdrawal = items.find((item) => item.id === "course-withdrawal");
  assert.ok(withdrawal);
  assert.equal(withdrawal.title, "수강철회 신청");
  assert.ok(
    /[가-힣]/.test(withdrawal.why),
    "the reason shown to a Korean student was not in Korean",
  );
  assert.ok(
    withdrawal.recovery.every((step) => /[가-힣]/.test(step)),
    "recovery steps were not translated",
  );
});

test("an international student reads the same requirement in English", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const withdrawal = items.find((item) => item.id === "course-withdrawal");
  assert.ok(withdrawal);
  assert.equal(withdrawal.title, "Withdraw from a course");
  assert.equal(withdrawal.officialKo, "수강철회");
  assert.ok(!/[가-힣]/.test(withdrawal.why));
});

test("the Korean name is kept in both languages, to show at an office", () => {
  for (const language of [true, false]) {
    const items = buildChecklist({
      ...BASE,
      today: "2026-09-19",
      profile: {
        isInternational: language,
        living: "dorm",
        university: "skku",
        semester: "first",
      },
    });
    for (const item of items) {
      assert.ok(
        /[가-힣]/.test(item.officialKo),
        `${item.id} has no Korean name to show at an office`,
      );
    }
  }
});

test("every requirement explains why it applies, in both languages", () => {
  for (const isInternational of [true, false]) {
    const items = buildChecklist({
      ...BASE,
      today: "2026-09-19",
      profile: {
        isInternational,
        living: "dorm",
        university: "skku",
        semester: "first",
      },
    });
    for (const item of items) {
      assert.ok(item.why.length > 10, `${item.id} has no explanation`);
    }
  }
});

test("a question carries the Korean term, the date and the source", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const overdue = items.find((item) => item.status === "overdue");
  assert.ok(overdue);
  const question = composeQuestion(overdue, "en", "2026-09-19");
  assert.match(question, /already missed it/);
  assert.ok(question.includes(overdue.officialKo));
  assert.ok(question.includes(overdue.dueDate));
  assert.ok(question.includes(overdue.sourceUrl));
});

test("a question about something still ahead asks how to prepare", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const ahead = items.find((item) => item.daysLeft > 0);
  assert.ok(ahead);
  const question = composeQuestion(ahead, "en", "2026-09-19");
  assert.match(question, /what I need to prepare/);
  assert.ok(!question.includes("already missed"));
});

test("a Korean student's question is written in Korean", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: false,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const first = items[0];
  assert.ok(first);
  const question = composeQuestion(first, "ko", "2026-09-19");
  assert.ok(/[가-힣]/.test(question));
  assert.ok(question.includes(first.officialKo));
});

test("a university whose calendar is not loaded still gets the national rules", () => {
  const skku = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const elsewhere = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "yonsei",
      semester: "first",
    },
  });

  assert.ok(
    elsewhere.length > 0,
    "another university was shown nothing at all",
  );
  assert.ok(
    elsewhere.every((item) => item.national),
    "a university's own deadlines leaked to a different university",
  );
  assert.ok(skku.length > elsewhere.length);

  const arc = elsewhere.find((item) => item.id === "arc-registration");
  assert.ok(arc, "immigration rules should hold at every university");
});

test("an unknown university id falls back rather than breaking", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "nonsense",
      semester: "first",
    },
  });
  assert.ok(items.length > 0);
});

test("the calendar link carries the date, the documents and the source", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  const arc = items.find((item) => item.id === "arc-registration");
  assert.ok(arc);
  const url = new URL(calendarUrl(arc, "en"));
  assert.equal(url.host, "calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  const dates = url.searchParams.get("dates") ?? "";
  const [start, end] = dates.split("/");
  assert.equal(start, arc.dueDate.replace(/-/g, ""));
  assert.ok(end && end > start, "the event must end after it starts");
  assert.equal(
    daysBetween(
      parseIsoDate(arc.dueDate)!,
      parseIsoDate(`${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6)}`)!,
    ),
    1,
    "an all-day event should end the following day",
  );
  const details = url.searchParams.get("details") ?? "";
  assert.ok(details.includes(arc.sourceUrl));
  assert.ok(details.includes(arc.bring[0]!));
  assert.ok((url.searchParams.get("text") ?? "").includes(arc.officialKo));
});

test("a domestic student sees the national scholarship deadline", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: false,
      living: "commuter",
      university: "skku",
      semester: "first",
    },
  });
  const scholarship = items.find((item) => item.id === "national-scholarship");
  assert.ok(
    scholarship,
    "the national scholarship is missing for a domestic student",
  );
  assert.equal(scholarship.status, "overdue");
  assert.ok(scholarship.recovery.length > 0);
});

test("the national scholarship applies at universities we have no calendar for", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: false,
      living: "dorm",
      university: "yonsei",
      semester: "first",
    },
  });
  assert.ok(items.some((item) => item.id === "national-scholarship"));
});

test("an international student is not shown the domestic-only items", () => {
  const items = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "first",
    },
  });
  for (const id of [
    "national-scholarship",
    "student-loan",
    "resident-registration",
  ]) {
    assert.ok(
      !items.some((item) => item.id === id),
      `${id} was shown to an international student`,
    );
  }
});

test("first-arrival tasks drop away after the first semester", () => {
  const base = {
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm" as const,
      university: "skku",
      semester: "first" as const,
    },
  };
  const first = buildChecklist(base);
  const later = buildChecklist({
    ...base,
    profile: { ...base.profile, semester: "later" as const },
  });

  assert.ok(first.length > later.length, "the list did not shrink");
  for (const id of ["enrolment-certificate", "dorm-application"]) {
    assert.ok(
      first.some((item) => item.id === id),
      `${id} should be there in a first semester`,
    );
    assert.ok(
      !later.some((item) => item.id === id),
      `${id} is still shown to a third-semester student`,
    );
  }
});

test("recurring deadlines survive into later semesters", () => {
  const later = buildChecklist({
    ...BASE,
    today: "2026-09-19",
    profile: {
      isInternational: true,
      living: "dorm",
      university: "skku",
      semester: "later",
    },
  });
  for (const id of ["course-withdrawal", "tuition-payment"]) {
    assert.ok(
      later.some((item) => item.id === id),
      `${id} applies every semester and should not have been dropped`,
    );
  }
});
