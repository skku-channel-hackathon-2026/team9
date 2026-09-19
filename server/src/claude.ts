import type {
  Language,
  RequirementState,
  StudentProfile,
} from "@tutorial/shared";

const MODEL = "claude-haiku-4-5-20251001";
const ENDPOINT = "https://api.anthropic.com/v1/messages";

/**
 * Whether a model can answer at all.
 *
 * The key is a Worker secret the organisers set, so it is absent in most
 * environments and must be. Everything here returns null when it is, and the
 * caller falls back to the written guides — the panel never depends on this.
 */
export function canAskClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Answer a student's question from their own checklist.
 *
 * The six written guides cover six procedures; the student has thirty-six
 * requirements. This closes that gap without letting a model invent Korean
 * immigration law: everything it is allowed to say is in the prompt, and it is
 * told to refuse rather than guess.
 *
 * Returns null on any failure — a missing key, a rate limit, a timeout. The
 * student still gets the written answer, so a bad minute at Anthropic costs
 * them nothing.
 */
export async function askClaude(input: {
  question: string;
  item: RequirementState | null;
  items: RequirementState[];
  profile: StudentProfile;
  today: string;
  language: Language;
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const ko = input.language === "ko";
  const outstanding = input.items
    .filter((item) => item.status !== "done")
    .slice(0, 12)
    .map(
      (item) =>
        `- ${item.officialKo} (${item.title}) — due ${item.dueDate}, ${
          item.daysLeft < 0
            ? `${Math.abs(item.daysLeft)} days overdue`
            : `${item.daysLeft} days left`
        }; where: ${item.where}; bring: ${item.bring.join(", ")}${
          item.fee ? `; cost: ${item.fee}` : ""
        }${item.penalty ? `; if missed: ${item.penalty}` : ""}`,
    )
    .join("\n");

  const focus = input.item
    ? `\nThe student asked this from the row for ${input.item.officialKo} (${input.item.title}).` +
      `\nRecovery steps on file: ${input.item.recovery.join(" / ")}` +
      `\nSource: ${input.item.sourceUrl}`
    : "";

  const system = [
    "You are UniCue, a checklist assistant for a Sungkyunkwan University freshman in Korea.",
    "",
    "Answer ONLY from the facts given below. They are sourced from the university,",
    "HiKorea and Korean government sites. If the facts do not cover the question,",
    "say so plainly and tell them to call 1345, the immigration helpline that",
    "answers in English. Never invent a deadline, a fee, a document or a legal rule.",
    "",
    ko
      ? "Answer in Korean, in 해요체, in three to six sentences."
      : "Answer in English, in three to six sentences.",
    "Be specific to this student's dates. Always give the Korean term they will",
    "need to say at the counter. Do not use markdown headings or bullet lists —",
    "this is a chat message.",
    "",
    `Today is ${input.today}.`,
    `The student is ${input.profile.isInternational ? "an international student" : "a domestic Korean student"}, living ${input.profile.living === "dorm" ? "in a dormitory" : "off campus"}.`,
    "",
    "What they still have to do:",
    outstanding || "- nothing outstanding",
    focus,
  ].join("\n");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        system,
        messages: [{ role: "user", content: input.question }],
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (body.content ?? [])
      .filter((part) => part.type === "text")
      .map((part) => part.text ?? "")
      .join("")
      .trim();

    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
