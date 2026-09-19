import assert from "node:assert/strict";
import test from "node:test";
import { TUTORIAL_FUNCTIONS } from "@tutorial/shared";

test("registers the calendar desk command", async () => {
  process.env.APP_ID = "test-app";
  process.env.APP_SECRET = "test-secret";
  process.env.SIGNING_KEY = "test-signing-key";
  const { CommandExtension } = await import("./tutorial.functions.js");
  const metadata = new CommandExtension().getCommands();
  const calendar = metadata.commands.find(
    (command) => command.name === "calendar",
  );

  assert.equal(calendar?.scope, "desk");
  assert.equal(calendar?.actionFunctionName, TUTORIAL_FUNCTIONS.showCalendar);
  assert.equal(calendar?.enabledByDefault, true);
});
