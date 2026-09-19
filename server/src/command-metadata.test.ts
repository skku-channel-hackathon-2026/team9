import assert from "node:assert/strict";
import test from "node:test";
import { TUTORIAL_FUNCTIONS } from "@tutorial/shared";

async function commands() {
  process.env.APP_ID = "test-app";
  process.env.APP_SECRET = "test-secret";
  process.env.SIGNING_KEY = "test-signing-key";
  const { CommandExtension } = await import("./tutorial.functions.js");
  return new CommandExtension().getCommands().commands;
}

test("declares the one command the AppStore registration holds", async () => {
  const declared = await commands();

  // Registration is run by the organisers, and this app cannot ask for it.
  // Declaring a command they have not registered does not add a command —
  // it only produces one that never appears, and a panel that reaches for
  // a function nobody has published. Everything the student needs is
  // therefore reached from inside the one command that does exist.
  assert.equal(
    declared.length,
    1,
    `only /tutorial is registered, but ${declared.length} commands are declared: ${declared.map((c) => c.name).join(", ")}`,
  );

  const [tutorial] = declared;
  assert.equal(tutorial?.name, "tutorial");
  assert.equal(tutorial?.scope, "desk");
  assert.equal(tutorial?.actionFunctionName, TUTORIAL_FUNCTIONS.open);
  assert.equal(tutorial?.enabledByDefault, true);
});

test("the command tells the agent when it applies and what to fill in", async () => {
  const [tutorial] = await commands();

  assert.equal(tutorial?.alfMode, "recommend");
  assert.ok(
    (tutorial?.alfDescription ?? "").length > 40,
    "the agent has nothing to match a student's wording against",
  );

  const params = (tutorial?.paramDefinitions ?? []).map((p) => p.name);
  for (const name of ["arrivalDate", "isInternational", "living"]) {
    assert.ok(
      params.includes(name),
      `${name} cannot be filled from a sentence`,
    );
  }
});
