import assert from "node:assert/strict";
import test from "node:test";
import {
  demoFreshmanProfile,
  formatFreshmanCalendarMessage,
  getRelevantFreshmanAnnouncements,
} from "./freshman-calendar.js";

test("selects the most relevant freshman calendar items", () => {
  const announcements = getRelevantFreshmanAnnouncements(demoFreshmanProfile);

  assert.equal(announcements.length, 3);
  assert.deepEqual(
    announcements.map((announcement) => announcement.title),
    [
      "Visa / immigration document check",
      "Dormitory safety orientation",
      "Computer Science freshman orientation",
    ],
  );
});

test("formats a chat-ready freshman calendar with explanations", () => {
  const message = formatFreshmanCalendarMessage(demoFreshmanProfile);

  assert.match(message, /Freshman calendar/);
  assert.match(message, /Profile: Computer Science/);
  assert.match(message, /Why: You are an international freshman/);
  assert.match(message, /Why: You live in the dormitory/);
  assert.match(
    message,
    /Why: You are a first-semester Computer Science student/,
  );
});
