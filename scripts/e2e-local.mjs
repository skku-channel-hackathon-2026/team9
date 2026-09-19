// End-to-end check against a locally running Worker with its D1 database.
//
//   terminal 1:  pnpm dev:cloudflare
//   terminal 2:  pnpm e2e:local
//
// Exercises the real request path AppStore uses: a signed PUT to /functions/v1.
// The signing key is the throwaway one from .dev.vars, so this is local only.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

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
const wamArgsOf = (result) => result.body?.result?.attributes?.wamArgs;
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
