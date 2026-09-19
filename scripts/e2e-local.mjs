// End-to-end check against a locally running Worker with its D1 database.
//
//   terminal 1:  pnpm dev:cloudflare
//   terminal 2:  pnpm e2e:local
//
// Exercises the real request path AppStore uses: a signed PUT to /functions/v1.
// The signing key is the throwaway one from .dev.vars, so this is local only.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { buildChecklist } from "../packages/shared/dist/index.js";

const origin = process.env.E2E_ORIGIN ?? "http://127.0.0.1:8797";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error("This end-to-end check is local-only");
}
const KEY = Buffer.from("11".repeat(32), "hex");

async function call(method, params = {}, context = undefined) {
  const payload = { method, params };
  if (context) payload.context = context;
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", KEY).update(body).digest("base64");
  const response = await fetch(`${origin}/functions/v1`, {
    method: "PUT",
    headers: { "content-type": "application/json", "x-signature": signature },
    body,
  });
  return { status: response.status, body: await response.json() };
}

const personIn = (channelId, id) => ({
  caller: { type: "manager", id },
  channel: { id: channelId },
});
/**
 * Desk passes wamArgs in the WAM's own URL, so the computed rows do not travel
 * — twenty-five of them came to 28KB encoded and the panel got a 414 instead
 * of loading. Only the stored answers cross the wire and the panel builds the
 * checklist itself, so the suite builds it the same way. That the build
 * succeeds here is the proof that what travels is enough.
 */
const wamArgsOf = (result) => {
  const args = result.body?.result?.attributes?.wamArgs;
  if (!args) return args;
  return {
    ...args,
    items: buildChecklist({
      arrivalDate: args.arrivalDate,
      semesterStart: args.semesterStart,
      completed: args.completed ?? [],
      booked: args.booked ?? {},
      today: args.today,
      profile: {
        isInternational: args.isInternational,
        living: args.living,
        university: args.university,
        semester: args.semester,
      },
    }),
  };
};
const idsOf = (items) => items.map((item) => item.id);

const passed = [];
function ok(label) {
  passed.push(label);
  console.log(`  ok  ${label}`);
}

console.log("\nHealth");
for (const path of ["/api/health", "/api/ready"]) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, `${path} did not answer`);
  assert.deepEqual(await response.json(), { ok: true });
  ok(`${path} responds`);
}

console.log("\nCommand metadata");
{
  const { body } = await call("extension.command.metadata.getCommands");
  const command = body.result.commands[0];
  assert.equal(command.actionFunctionName, "tutorial.open");
  ok("the command points at tutorial.open");
  assert.equal(command.alfMode, "recommend");
  ok("ALF is allowed to recommend the command");
  assert.ok(
    command.alfDescription && command.alfDescription.length > 40,
    "alfDescription is missing or too short for ALF to match on",
  );
  ok("ALF has a description to match natural language against");
  assert.equal(command.systemVersion, "v1");
  ok("AppStore stamped the system contract version");
}

console.log("\nA student who has never opened this before");
const fresh = personIn("ch-e2e", `new-${Date.now()}`);
let today;
{
  const result = await call("tutorial.open", {}, fresh);
  assert.equal(result.status, 200);
  const args = wamArgsOf(result);
  assert.ok(args, "no wamArgs came back");
  today = args.today;
  assert.equal(args.isNew, true);
  ok("is asked for their arrival date rather than shown guessed dates");
  assert.equal(args.canSave, true);
  ok("the database is reachable, so ticks will persist");
  assert.ok(args.items.length > 0);
  ok(`sees ${args.items.length} requirements`);
  for (const item of args.items) {
    assert.match(item.sourceUrl, /^https:\/\//, `${item.id} has no source`);
    assert.ok(item.bring.length > 0, `${item.id} lists no documents`);
    assert.ok(item.where.length > 0, `${item.id} has no location`);
  }
  ok("every requirement cites a source and says what to bring and where");
}

console.log("\nSaving without anything new registered");
{
  const solo = personIn("ch-e2e", `solo-${Date.now()}`);
  // Only tutorial.open is used here. It is the function AppStore already knows
  // about, so this is the path that works before any re-registration.
  const before = wamArgsOf(await call("tutorial.open", {}, solo));
  assert.equal(before.isNew, true);

  const afterSave = wamArgsOf(
    await call(
      "tutorial.open",
      { input: { arrivalDate: "2026-09-01", isInternational: true } },
      solo,
    ),
  );
  assert.equal(afterSave.arrivalDate, "2026-09-01");
  assert.equal(afterSave.isNew, false);
  ok("the command function accepts and stores progress through its input");

  const reopened = wamArgsOf(await call("tutorial.open", {}, solo));
  assert.equal(reopened.arrivalDate, "2026-09-01");
  ok("it survives a fresh request with no input");

  await call(
    "tutorial.open",
    { input: { completed: ["course-withdrawal"] } },
    solo,
  );
  const ticked = wamArgsOf(await call("tutorial.open", {}, solo));
  assert.equal(
    ticked.items.find((item) => item.id === "course-withdrawal")?.status,
    "done",
  );
  ok("a ticked requirement stays ticked");

  const bad = await call(
    "tutorial.open",
    { input: { arrivalDate: "2026-9-1" } },
    solo,
  );
  assert.equal(bad.body.error?.type, "invalidArrivalDate");
  ok("a malformed date sent this way is still refused");
}

console.log("\nSaving an arrival date");
const alice = personIn("ch-e2e", `alice-${Date.now()}`);
{
  await call("tutorial.open", {}, alice);
  const saved = await call(
    "tutorial.saveProgress",
    { completed: [], arrivalDate: "2026-09-01", isInternational: true },
    alice,
  );
  assert.equal(saved.body.result.saved, true);
  ok("the date is accepted");

  const args = wamArgsOf(await call("tutorial.open", {}, alice));
  assert.equal(args.isNew, false);
  ok("they are not asked again");
  assert.equal(args.arrivalDate, "2026-09-01");
  ok("the date survives a fresh request");

  const arc = args.items.find((item) => item.id === "arc-registration");
  assert.ok(arc, "alien registration is missing for an international student");
  assert.equal(arc.dueDate, "2026-11-30");
  ok("alien registration falls 90 days after arrival (2026-11-30)");
}

console.log("\nTicking things off");
{
  await call(
    "tutorial.saveProgress",
    { completed: ["arc-registration"], arrivalDate: "2026-09-01" },
    alice,
  );
  const args = wamArgsOf(await call("tutorial.open", {}, alice));
  const arc = args.items.find((item) => item.id === "arc-registration");
  assert.equal(arc.status, "done");
  ok("a completed requirement stays completed");

  const dup = await call(
    "tutorial.saveProgress",
    { completed: ["arc-registration", "arc-registration"] },
    alice,
  );
  assert.deepEqual(dup.body.result.completed, ["arc-registration"]);
  ok("the same id twice is stored once");
}

console.log("\nOne student cannot see another's progress");
{
  const bob = personIn("ch-e2e", `bob-${Date.now()}`);
  const args = wamArgsOf(await call("tutorial.open", {}, bob));
  assert.equal(args.isNew, true);
  assert.equal(
    args.items.filter((item) => item.status === "done").length,
    0,
    "another student's completions leaked",
  );
  ok("a different person starts clean");

  const otherChannel = wamArgsOf(
    await call("tutorial.open", {}, personIn("ch-other", alice.caller.id)),
  );
  assert.equal(otherChannel.isNew, true);
  ok("the same person in another channel starts clean");
}

console.log("\nOnly what applies to you");
{
  const domestic = personIn("ch-e2e", `domestic-${Date.now()}`);
  await call(
    "tutorial.saveProgress",
    { completed: [], arrivalDate: "2026-09-01", isInternational: false },
    domestic,
  );
  const args = wamArgsOf(await call("tutorial.open", {}, domestic));
  const immigration = args.items.filter((i) => i.scope === "immigration");
  assert.equal(
    immigration.length,
    0,
    `a domestic student was shown: ${idsOf(immigration).join(", ")}`,
  );
  ok("a domestic student is not shown immigration requirements");

  const international = wamArgsOf(await call("tutorial.open", {}, alice));
  assert.ok(international.items.length > args.items.length);
  ok(
    `an international student sees more (${international.items.length} vs ${args.items.length})`,
  );
}

console.log("\nOne command, every entry point");
{
  const planner = personIn("ch-e2e", `planner-${Date.now()}`);
  await call(
    "tutorial.saveProgress",
    { completed: [], arrivalDate: "2026-09-01", isInternational: true },
    planner,
  );

  // Only /tutorial is registered, and the organisers run registration. A
  // command declared here but not registered there never appears in Desk, so
  // declaring one is worse than not having it: the panel would offer a route
  // that goes nowhere.
  const { body } = await call("extension.command.metadata.getCommands");
  const declared = body.result.commands;
  assert.equal(
    declared.length,
    1,
    `expected only /tutorial, got: ${declared.map((c) => c.name).join(", ")}`,
  );
  assert.equal(declared[0].name, "tutorial");
  assert.equal(declared[0].actionFunctionName, "tutorial.open");
  ok("only the registered command is published");

  const args = wamArgsOf(await call("tutorial.open", {}, planner));
  assert.equal(args.arrivalDate, "2026-09-01");
  ok("it opens on that person's saved progress");
  assert.ok(args.items.length > 0);
  ok(`every requirement is reachable from it (${args.items.length})`);

  const dated = wamArgsOf(
    await call("tutorial.open", { input: { view: "calendar" } }, planner),
  );
  assert.equal(dated.view, "calendar");
  ok("the full dated view is asked for through the same command");
  assert.deepEqual(idsOf(dated.items), idsOf(args.items));
  ok("it is the same person's checklist, not a second one");
}

console.log("\nAsking a question");
{
  const asker = personIn("ch-e2e", `asker-${Date.now()}`);
  await call(
    "tutorial.saveProgress",
    { completed: [], arrivalDate: "2026-09-01", isInternational: true },
    asker,
  );

  const visa = await call(
    "tutorial.ask",
    { question: "How do I extend my visa before it expires?" },
    asker,
  );
  assert.equal(visa.status, 200);
  const answer = visa.body.result;
  assert.equal(answer.origin, "guide");
  ok("a visa question is answered from the written guide");
  assert.ok(
    answer.answer.includes("체류기간 연장허가"),
    "the answer does not name the procedure in Korean",
  );
  ok("the answer carries the Korean term to say at the counter");
  assert.ok(
    answer.sources.length > 0 && answer.sources[0].url.startsWith("https://"),
  );
  ok("the answer cites something the student can read themselves");
  assert.ok(answer.followUps.length > 0);
  ok("it offers the question they are likely to have next");
  assert.equal(answer.askedInChat, false);
  ok("with no chat to post into, it says so rather than pretending");

  const aboutRow = await call(
    "tutorial.ask",
    { question: "What do I bring?", about: "arc-registration" },
    asker,
  );
  assert.ok(
    aboutRow.body.result.followUps.some((question) =>
      question.includes("Alien Registration"),
    ),
    "the follow-ups ignored the row the question came from",
  );
  ok("a question asked from a row is answered about that row");

  const unknown = await call(
    "tutorial.ask",
    { question: "where is the nearest library" },
    asker,
  );
  assert.equal(unknown.body.result.origin, "unavailable");
  assert.ok(unknown.body.result.answer.includes("1345"));
  ok("an unanswerable question says so and names somewhere to go");

  // Posting into the chat is best effort: a target that cannot be honoured
  // must not cost the student the answer they asked for.
  const badTarget = await call(
    "tutorial.ask",
    { question: "How do I extend my visa?", targetToken: "not-a-real-token" },
    asker,
  );
  assert.equal(badTarget.status, 200);
  assert.equal(badTarget.body.result.askedInChat, false);
  ok("a target it cannot post to still returns the answer");

  const empty = await call("tutorial.ask", { question: "" }, asker);
  assert.ok(empty.body.error, "an empty question was accepted");
  ok("an empty question is refused");
}

console.log("\nBad input is refused, not swallowed");
{
  const bad = await call(
    "tutorial.saveProgress",
    { completed: [], arrivalDate: "2026-9-1" },
    alice,
  );
  assert.ok(bad.body.error, "a malformed date was accepted");
  assert.equal(bad.body.error.type, "invalidArrivalDate");
  ok("a malformed arrival date is rejected with a typed error");

  const unsigned = await fetch(`${origin}/functions/v1`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ method: "tutorial.open", params: {} }),
  });
  assert.equal(unsigned.status, 401);
  ok("an unsigned request is rejected");
}

console.log(`\nPASS — ${passed.length} checks, as of ${today}\n`);
