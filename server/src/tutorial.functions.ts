import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  buildChecklist,
  composeAlfQuestion,
  composeGuideAnswer,
  findGuide,
  sourcesFor,
  suggestedQuestions,
  ASSISTANT_FUNCTIONS,
  AssistantAnswerSchema,
  AssistantAskInputSchema,
  HELP,
  languageFor,
  composeSummary,
  composeQuestion,
  AskAboutSchema,
  applyProgressUpdate,
  hasProgressUpdate,
  ProgressUpdateSchema,
  CHECKLIST_FUNCTIONS,
  CommandActionInputSchema,
  defaultProgress,
  parseIsoDate,
  SaveProgressInputSchema,
  SaveProgressOutputSchema,
  SendAsBotInputSchema,
  StoredProgressSchema,
  TUTORIAL_FUNCTIONS,
  TUTORIAL_WAM_NAME,
  type AssistantAnswer,
  type AssistantAskInput,
  type CommandActionInput,
  type SaveProgressInput,
  type SendAsBotInput,
  type StoredProgress,
  type TutorialWamArgs,
} from "@tutorial/shared";
import {
  CommandResultSchema,
  Ctx,
  Description,
  Extension,
  Func,
  FunctionCallError,
  FunctionCallErrorCode,
  GetCommandsOutputSchema,
  Input,
  InputSchema,
  NativeFunctionClient,
  OutputSchema,
  TokenManager,
  type Context,
} from "@channel.io/app-sdk-server";
import { appId, appSecret } from "./config.js";
import {
  createTutorialTargetToken,
  readTutorialTargetToken,
} from "./target-token.js";
import {
  hasDatabase,
  progressRecordId,
  readRecord,
  writeRecord,
} from "./records.js";

const tutorialMessage = "This is a test message sent by a manager.";

/** Deadlines here are counted in Seoul, where the offices actually are. */
function todayInSeoul(): string {
  const now = new Date();
  return new Date(now.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function recordIdFor(ctx: Context): string {
  return progressRecordId(ctx.channel.id, ctx.caller.type, ctx.caller.id ?? "");
}

/**
 * Stored progress, plus whether this person has ever saved anything. Every
 * deadline is counted from their arrival date, so a first-time reader is asked
 * for it rather than being shown a list built on a guess.
 */
async function loadProgress(
  ctx: Context,
  today: string,
): Promise<{ progress: StoredProgress; isNew: boolean }> {
  const parsed = StoredProgressSchema.safeParse(
    await readRecord(recordIdFor(ctx)),
  );
  return parsed.success
    ? { progress: parsed.data, isNew: false }
    : { progress: defaultProgress(today), isNew: true };
}

@Extension({ name: "command", systemVersion: "v1" })
export class CommandExtension {
  @Func("metadata.getCommands")
  @Description("Return the tutorial command definition")
  @InputSchema(z.object({}))
  @OutputSchema(GetCommandsOutputSchema)
  getCommands(): z.infer<typeof GetCommandsOutputSchema> {
    return {
      commands: [
        {
          name: "tutorial",
          scope: "desk",
          description: "신입생 체크리스트: 무엇을 언제까지 해야 하는지",
          actionFunctionName: TUTORIAL_FUNCTIONS.open,
          alfMode: "recommend",
          alfDescription:
            "Opens a new student's personal checklist of things they must " +
            "complete after arriving in Korea, with the deadline for each " +
            "one, the documents to bring and where to go. Recommend this " +
            "when someone asks what they need to do, what paperwork is " +
            "required, when something is due, or about alien registration " +
            "(ARC), reporting their address, health insurance, tuition " +
            "payment or course withdrawal.",
          enabledByDefault: true,
          // ALF fills these from what the student typed, so someone who says
          // "I arrived on 1 September" never has to fill the form in.
          paramDefinitions: [
            {
              name: "arrivalDate",
              type: "string",
              required: false,
              description: "Entry date, YYYY-MM-DD",
              alfDescription:
                "The date this student entered Korea, formatted as " +
                "YYYY-MM-DD. Every immigration deadline is counted from it. " +
                "Fill it in whenever the student mentions when they arrived, " +
                "landed, came to Korea or started their stay, including " +
                "relative phrasing such as 'last month' or 'two weeks ago'. " +
                "Leave it out if they have not said.",
            },
            {
              name: "living",
              type: "string",
              required: false,
              description: "dorm or commuter",
              alfDescription:
                'Where the student lives: "dorm" if they live in ' +
                'university dormitory housing, "commuter" if they travel ' +
                "in from outside. Requirements that only exist for one of " +
                "these are hidden from the other. Leave it out if unclear.",
            },
            {
              name: "isInternational",
              type: "bool",
              required: false,
              description: "International student",
              alfDescription:
                "True when the student is an international student, on a " +
                "student visa, an exchange student, or otherwise not a " +
                "Korean national. False when they are a domestic Korean " +
                "student. Immigration requirements are only shown when this " +
                "is true. Leave it out if it is not clear.",
            },
          ],
        },
        // The dated view of the same checklist, for a student who came to
        // plan rather than to act. It opens the same panel on the same saved
        // progress, so there is nothing extra to keep in step.
        // The same checklist on the customer-facing surface, which is
        // where a student and ALF actually meet. Both become active on
        // one registration; neither changes behaviour until then.
      ],
    };
  }
}

@Injectable()
export class TutorialFunctions {
  constructor(
    private readonly tokenManager: TokenManager,
    private readonly nativeClient: NativeFunctionClient,
  ) {}

  @Func(TUTORIAL_FUNCTIONS.open)
  @Description("Open the freshman checklist for the current person")
  @InputSchema(CommandActionInputSchema)
  @OutputSchema(CommandResultSchema)
  async open(
    @Ctx() ctx: Context,
    @Input() params: CommandActionInput,
  ): Promise<z.infer<typeof CommandResultSchema>> {
    return this.openPanel(ctx, params, "brief");
  }

  /**
   * The same checklist, opened on every date at once.
   *
   * `/tutorial` answers "what do I have to do"; this answers "what is coming
   * and when", which is the question a student asks while planning a term
   * rather than while panicking about a deadline. Same data, same person,
   * same saved progress — only the first screen differs, because sending
   * someone to a different app to see their own dates is how they lose them.
   */
  @Func(TUTORIAL_FUNCTIONS.showCalendar)
  @Description("Open the freshman checklist on the full dated view")
  @InputSchema(CommandActionInputSchema)
  @OutputSchema(CommandResultSchema)
  async showCalendar(
    @Ctx() ctx: Context,
    @Input() params: CommandActionInput,
  ): Promise<z.infer<typeof CommandResultSchema>> {
    return this.openPanel(ctx, params, "calendar");
  }

  private async openPanel(
    ctx: Context,
    params: CommandActionInput,
    view: "brief" | "calendar",
  ): Promise<z.infer<typeof CommandResultSchema>> {
    const chat = params.chat;
    const managerId = ctx.caller.id ?? "";
    const triggerAttributes = params.trigger?.attributes ?? {};
    const targetToken =
      chat?.type === "group" &&
      chat.id &&
      ctx.caller.type === "manager" &&
      managerId
        ? createTutorialTargetToken(
            {
              channelId: ctx.channel.id,
              groupId: chat.id,
              managerId,
              // A student reads the panel, thinks, and asks a few minutes
              // later. Five minutes meant the permission to post into the
              // chat had usually expired by the time they did, and the
              // question was answered in the panel and went nowhere.
              expiresAt: Date.now() + 60 * 60 * 1000,
            },
            appSecret,
          )
        : undefined;

    const tutorialArgs = {
      chatId: chat?.id ?? "",
      chatType: chat?.type ?? "",
      chatTitle: triggerAttributes.chatTitle ?? "",
      rootMessageId: triggerAttributes.rootMessageId,
      broadcast: triggerAttributes.broadcast === "true",
      managerId,
      message: tutorialMessage,
      targetToken,
    } satisfies TutorialWamArgs;

    // /calendar is gone: a command the organisers have not registered never
    // appears in Desk at all. The dated view it used to open is still here,
    // asked for through the input field of the one command that is registered.
    const requestedView =
      params.input?.["view"] === "calendar" ? "calendar" : view;

    const today = todayInSeoul();
    const loaded = await loadProgress(ctx, today);
    let progress = loaded.progress;
    let isNew = loaded.isNew;

    // The WAM saves through this same function. `input` is part of the command
    // contract AppStore already knows, so nothing new has to be registered.
    // A student can also ask about one requirement from here. The question
    // goes into the chat the command was opened from, where ALF or a person
    // can answer it — the panel can state a rule but cannot discuss it.
    const ask = AskAboutSchema.safeParse(params.input);
    if (ask.success) {
      await this.askInChat(ctx, ask.data, today, progress);
    }

    // The question view calls this same function. tutorial.ask is not in the
    // registration AppStore holds, so a question sent through the command's
    // own input field is the only path that works before re-registration.
    const asked = AssistantAskInputSchema.safeParse(params.input);
    const assistantAnswer =
      asked.success && asked.data.question.trim().length > 0
        ? await this.ask(ctx, asked.data)
        : undefined;

    const update = ProgressUpdateSchema.safeParse(params.input);
    if (update.success && hasProgressUpdate(update.data)) {
      const next = applyProgressUpdate(progress, update.data);
      if (!next) {
        throw new FunctionCallError(
          "The arrival date must be formatted as YYYY-MM-DD",
          FunctionCallErrorCode.BadRequest,
          { type: "invalidArrivalDate" },
        );
      }
      if (!(await writeRecord(recordIdFor(ctx), next))) {
        throw new FunctionCallError(
          "Progress could not be saved",
          FunctionCallErrorCode.Internal,
          { type: "storageUnavailable" },
        );
      }
      progress = next;
      isNew = false;
    }

    return {
      type: "wam",
      attributes: {
        appId,
        name: TUTORIAL_WAM_NAME,
        wamArgs: {
          ...tutorialArgs,
          items: buildChecklist({
            ...progress,
            today,
            profile: {
              isInternational: progress.isInternational,
              living: progress.living,
              university: progress.university,
              semester: progress.semester,
            },
          }),
          arrivalDate: progress.arrivalDate,
          isInternational: progress.isInternational,
          living: progress.living,
          university: progress.university,
          semester: progress.semester,
          semesterStart: progress.semesterStart,
          today,
          name: await this.readManagerName(ctx),
          isNew,
          canSave: hasDatabase(),
          assistantAnswer,
          view: requestedView,
        },
      },
    };
  }

  @Func(TUTORIAL_FUNCTIONS.sendAsBot)
  @Description("Post this person's checklist into the chat as the app bot")
  @InputSchema(SendAsBotInputSchema)
  @OutputSchema(z.object({}))
  async sendAsBot(
    @Ctx() ctx: Context,
    @Input() input: SendAsBotInput,
  ): Promise<Record<string, never>> {
    const target = readTutorialTargetToken(input.targetToken, appSecret);
    if (
      !target ||
      target.expiresAt <= Date.now() ||
      target.channelId !== ctx.channel.id ||
      ctx.caller.type !== "manager" ||
      target.managerId !== ctx.caller.id
    ) {
      throw new FunctionCallError(
        "The tutorial target is invalid or expired",
        FunctionCallErrorCode.BadRequest,
        { type: "invalidTarget" },
      );
    }

    const today = todayInSeoul();
    const { progress } = await loadProgress(ctx, today);
    const summary = composeSummary(
      buildChecklist({
        ...progress,
        today,
        profile: {
          isInternational: progress.isInternational,
          living: progress.living,
          university: progress.university,
          semester: progress.semester,
        },
      }),
      today,
    );

    const token = await this.tokenManager.getChannelToken({
      channelId: ctx.channel.id,
    });
    const api = this.nativeClient.createProxyApi(token.accessToken);

    try {
      await api.writeGroupMessage({
        channelId: ctx.channel.id,
        groupId: target.groupId,
        rootMessageId: input.rootMessageId,
        broadcast: input.broadcast,
        dto: {
          plainText: summary,
          botName: "Freshman Checklist",
        },
      });
    } catch {
      throw new FunctionCallError(
        "The bot message could not be sent",
        FunctionCallErrorCode.Internal,
        { type: "nativeCallFailed" },
      );
    }

    return {};
  }

  /**
   * The reader's own name, so the panel can greet them. Channel does not
   * promise this field, and a missing name is not worth failing a request
   * over, so anything unexpected simply means no greeting.
   */
  private async readManagerName(ctx: Context): Promise<string | undefined> {
    const managerId = ctx.caller.id;
    if (ctx.caller.type !== "manager" || !managerId) return undefined;
    try {
      const token = await this.tokenManager.getChannelToken({
        channelId: ctx.channel.id,
      });
      const result = await this.nativeClient
        .createProxyApi(token.accessToken)
        .getManager({ channelId: ctx.channel.id, managerId });
      const name = result?.manager?.name;
      return typeof name === "string" && name.length > 0 ? name : undefined;
    } catch {
      return undefined;
    }
  }

  /** Posts one requirement into the chat as a question, as the app bot. */
  private async askInChat(
    ctx: Context,
    ask: { askAbout: string; targetToken: string },
    today: string,
    progress: StoredProgress,
  ): Promise<void> {
    const target = readTutorialTargetToken(ask.targetToken, appSecret);
    if (
      !target ||
      target.expiresAt <= Date.now() ||
      target.channelId !== ctx.channel.id ||
      ctx.caller.type !== "manager" ||
      target.managerId !== ctx.caller.id
    ) {
      throw new FunctionCallError(
        "The chat target is invalid or expired",
        FunctionCallErrorCode.BadRequest,
        { type: "invalidTarget" },
      );
    }

    const profile = {
      isInternational: progress.isInternational,
      living: progress.living,
      university: progress.university,
      semester: progress.semester,
    };
    const item = buildChecklist({ ...progress, today, profile }).find(
      (candidate) => candidate.id === ask.askAbout,
    );
    if (!item) {
      throw new FunctionCallError(
        "That requirement does not apply to you",
        FunctionCallErrorCode.BadRequest,
        { type: "unknownRequirement" },
      );
    }

    if (
      !(await this.postToGroup(
        ctx,
        target.groupId,
        composeQuestion(item, languageFor(profile), today),
      ))
    ) {
      throw new FunctionCallError(
        "The question could not be posted",
        FunctionCallErrorCode.Internal,
        { type: "nativeCallFailed" },
      );
    }
  }

  /**
   * Posts into the chat the panel was opened from, if that is still allowed.
   * Returns false rather than throwing: the caller has an answer to deliver
   * either way, and a chat that cannot be posted to is a normal situation —
   * the panel opens outside group chats too.
   */
  private async tryPostToChat(
    ctx: Context,
    targetToken: string,
    text: string,
  ): Promise<boolean> {
    const target = readTutorialTargetToken(targetToken, appSecret);
    if (
      !target ||
      target.expiresAt <= Date.now() ||
      target.channelId !== ctx.channel.id ||
      ctx.caller.type !== "manager" ||
      target.managerId !== ctx.caller.id
    ) {
      return false;
    }
    return this.postToGroup(ctx, target.groupId, text);
  }

  /** The app bot writing into a group. False when the call did not go through. */
  private async postToGroup(
    ctx: Context,
    groupId: string,
    text: string,
  ): Promise<boolean> {
    try {
      const token = await this.tokenManager.getChannelToken({
        channelId: ctx.channel.id,
      });
      await this.nativeClient
        .createProxyApi(token.accessToken)
        .writeGroupMessage({
          channelId: ctx.channel.id,
          groupId,
          dto: { plainText: text, botName: "Freshman Checklist" },
        });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * A question from the panel, answered twice over.
   *
   * The written guide comes back immediately, so the student has something
   * true in front of them before anything else happens — it needs no chat, no
   * AI and no network beyond this call. The same question is then handed to
   * ALF in the conversation with this student's own dates attached, because
   * the follow-up they will actually have ("so do I extend before or after
   * this?") belongs in a conversation, and ALF answers it far better knowing
   * what is already overdue than it would from the question alone.
   *
   * Posting is best effort on purpose. Outside a group chat there is nowhere
   * to post, and that must not cost the student the answer they asked for.
   */
  @Func(ASSISTANT_FUNCTIONS.ask)
  @Description(
    "Answer a question about this person's checklist and pass it to ALF",
  )
  @InputSchema(AssistantAskInputSchema)
  @OutputSchema(AssistantAnswerSchema)
  async ask(
    @Ctx() ctx: Context,
    @Input() input: AssistantAskInput,
  ): Promise<AssistantAnswer> {
    const today = todayInSeoul();
    const { progress } = await loadProgress(ctx, today);
    const profile = {
      isInternational: progress.isInternational,
      living: progress.living,
      university: progress.university,
      semester: progress.semester,
    };
    const language = languageFor(profile);
    const items = buildChecklist({ ...progress, today, profile });
    const item = input.about
      ? (items.find((candidate) => candidate.id === input.about) ?? null)
      : null;
    // The row the question was asked from is part of the question, so the
    // guide is matched against both rather than the typed words alone.
    const guide = findGuide(
      item
        ? `${input.question} ${item.title} ${item.officialKo}`
        : input.question,
    );

    const askedInChat = input.targetToken
      ? await this.tryPostToChat(
          ctx,
          input.targetToken,
          composeAlfQuestion({
            question: input.question,
            item,
            guide,
            items,
            profile,
            today,
            language,
          }),
        )
      : false;

    const sources = sourcesFor(guide, item, language);
    const followUps = suggestedQuestions(language, item);

    if (guide) {
      return {
        answer: composeGuideAnswer(guide, language),
        origin: "guide",
        sources,
        followUps,
        askedInChat,
      };
    }

    // Nothing written covers it. Say so rather than improvise, and name the
    // two places that can answer: the conversation, if the question got
    // there, and the offices that are obliged to.
    return {
      answer:
        language === "ko"
          ? [
              "이 질문에 대한 안내 자료가 아직 없습니다.",
              askedInChat
                ? "대화창에 질문을 남겼으니 ALF 또는 담당자가 답변할 것입니다."
                : "",
              `출입국 관련은 ${HELP.immigrationPhone} (외국인종합안내센터), 학사 관련은 국제처에 문의하세요.`,
            ]
              .filter(Boolean)
              .join(" ")
          : [
              "I do not have written guidance for that one.",
              askedInChat
                ? "Your question is now in the chat, where ALF or a member of staff can answer it."
                : "",
              `For immigration call ${HELP.immigrationPhone}; for university matters ask your international office.`,
            ]
              .filter(Boolean)
              .join(" "),
      origin: "unavailable",
      sources,
      followUps,
      askedInChat,
    };
  }

  @Func(CHECKLIST_FUNCTIONS.saveProgress)
  @Description("Record which requirements this person has completed")
  @InputSchema(SaveProgressInputSchema)
  @OutputSchema(SaveProgressOutputSchema)
  async saveProgress(
    @Ctx() ctx: Context,
    @Input() input: SaveProgressInput,
  ): Promise<z.infer<typeof SaveProgressOutputSchema>> {
    if (input.arrivalDate && parseIsoDate(input.arrivalDate) === null) {
      throw new FunctionCallError(
        "The arrival date must be formatted as YYYY-MM-DD",
        FunctionCallErrorCode.BadRequest,
        { type: "invalidArrivalDate" },
      );
    }

    const { progress: current } = await loadProgress(ctx, todayInSeoul());
    const next: StoredProgress = {
      arrivalDate: input.arrivalDate ?? current.arrivalDate,
      semesterStart: current.semesterStart,
      completed: Array.from(new Set(input.completed)),
      isInternational: input.isInternational ?? current.isInternational,
      living: current.living,
      university: current.university,
      semester: current.semester,
    };

    if (!(await writeRecord(recordIdFor(ctx), next))) {
      throw new FunctionCallError(
        "Progress could not be saved",
        FunctionCallErrorCode.Internal,
        { type: "storageUnavailable" },
      );
    }

    return { saved: true, completed: next.completed };
  }
}
