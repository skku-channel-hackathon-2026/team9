import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  buildChecklist,
  composeSummary,
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
        },
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
              expiresAt: Date.now() + 5 * 60 * 1000,
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

    const today = todayInSeoul();
    const { progress, isNew } = await loadProgress(ctx, today);

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
            profile: { isInternational: progress.isInternational },
          }),
          arrivalDate: progress.arrivalDate,
          isInternational: progress.isInternational,
          semesterStart: progress.semesterStart,
          today,
          isNew,
          canSave: hasDatabase(),
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
        profile: { isInternational: progress.isInternational },
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
