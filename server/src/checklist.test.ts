import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildChecklist,
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
