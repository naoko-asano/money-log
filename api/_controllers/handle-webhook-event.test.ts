import { describe, expect, it, vi } from "vitest";
import { createMockedErrorHandler } from "#api/_test-utils/error-handler.js";
import { createMockedExpensesRepo } from "#api/_test-utils/expenses-repo.js";
import { createMockedReply } from "#api/_test-utils/reply.js";
import type { MediaReader } from "#api/_usecases/_ports/media-reader.js";
import type { PendingExpensesRepo } from "#api/_usecases/_ports/pending-expenses-repo.js";
import { buildConfirmationItems } from "#api/_usecases/confirmation-payload.js";
import type { ExpenseParser } from "#api/_usecases/parse-expense.js";
import { handleWebhookEvent } from "./handle-webhook-event";

type Deps = Parameters<typeof handleWebhookEvent>[1];

const EXPENSE = {
  date: new Date("2026-01-15"),
  amount: 500,
  category: "食費" as const,
};

const PENDING_EXPENSE = {
  ...EXPENSE,
  webhookEventId: "event-001",
};

const BASE_EVENT = {
  webhookEventId: "event-001",
  userId: "user-001",
  replyToken: "reply-token-001",
};

function createMockedPendingExpensesRepo(
  overrides: Partial<PendingExpensesRepo> = {},
): PendingExpensesRepo {
  return {
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockedExpenseParser(
  overrides: Partial<ExpenseParser> = {},
): ExpenseParser {
  return {
    fromText: vi.fn().mockResolvedValue(EXPENSE),
    fromImage: vi.fn().mockResolvedValue(EXPENSE),
    ...overrides,
  };
}

function createMockedMediaReader(
  overrides: Partial<MediaReader> = {},
): MediaReader {
  return {
    read: vi
      .fn()
      .mockResolvedValue({ mimeType: "image/jpeg", imageBase64: "encoded" }),
    ...overrides,
  };
}

function createMockedDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    reply: createMockedReply(),
    errorHandler: createMockedErrorHandler(),
    expenseParser: createMockedExpenseParser(),
    mediaReader: createMockedMediaReader(),
    expensesRepo: createMockedExpensesRepo(),
    pendingExpensesRepo: createMockedPendingExpensesRepo(),
    ...overrides,
  };
}

describe("confirmationイベントを受け取った場合", () => {
  it("有効なpayloadの場合、確認結果に応じて支出を登録する", async () => {
    const deps = createMockedDeps({
      pendingExpensesRepo: createMockedPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
      }),
    });

    await handleWebhookEvent(
      {
        ...BASE_EVENT,
        type: "confirmation",
        confirmationPayload: buildConfirmationItems("event-001")[0].data,
      },
      deps,
    );

    expect(deps.expensesRepo.createFromPending).toHaveBeenCalledOnce();
    expect(deps.expensesRepo.createFromPending).toHaveBeenCalledWith(
      "user-001",
      PENDING_EXPENSE,
    );
    expect(deps.reply.send).toHaveBeenCalledOnce();
    expect(deps.reply.send).toHaveBeenCalledWith("登録しました！");
  });

  it("不正なpayloadの場合、エラーハンドラーを呼び出し、支出登録の処理は行わない", async () => {
    const deps = createMockedDeps();

    await handleWebhookEvent(
      {
        ...BASE_EVENT,
        type: "confirmation",
        confirmationPayload: "not json",
      },
      deps,
    );

    expect(deps.errorHandler.run).toHaveBeenCalledOnce();
    expect(deps.errorHandler.run).toHaveBeenCalledWith({
      error: expect.any(Error),
      label: "parseConfirmationPayload",
      reply: deps.reply,
    });
    expect(deps.pendingExpensesRepo.get).not.toHaveBeenCalled();
    expect(deps.expensesRepo.createFromPending).not.toHaveBeenCalled();
  });
});

describe("textイベントを受け取った場合", () => {
  it("入力されたテキストを解析して確認待ち支出を作成する", async () => {
    const deps = createMockedDeps();

    await handleWebhookEvent(
      { ...BASE_EVENT, type: "text", text: "コーヒー 500円" },
      deps,
    );

    expect(deps.expenseParser.fromText).toHaveBeenCalledOnce();
    expect(deps.expenseParser.fromText).toHaveBeenCalledWith("コーヒー 500円");
    expect(deps.pendingExpensesRepo.create).toHaveBeenCalledOnce();
    expect(deps.pendingExpensesRepo.create).toHaveBeenCalledWith(
      "user-001",
      EXPENSE,
      "event-001",
    );
    expect(deps.reply.sendWithQuickItems).toHaveBeenCalledOnce();
    expect(deps.reply.sendWithQuickItems).toHaveBeenCalledWith(
      expect.not.stringContaining(
        "先に確認中の支出を「はい」か「いいえ」で回答してください。",
      ),
      expect.any(Array),
    );
  });
});

describe("imageイベントを受け取った場合", () => {
  it("画像を取得して解析し、確認待ち支出を作成する", async () => {
    const deps = createMockedDeps({
      mediaReader: createMockedMediaReader({
        read: vi.fn().mockResolvedValue({
          mimeType: "image/png",
          imageBase64: "encoded-image",
        }),
      }),
    });

    await handleWebhookEvent(
      { ...BASE_EVENT, type: "image", messageId: "message-001" },
      deps,
    );

    expect(deps.mediaReader.read).toHaveBeenCalledOnce();
    expect(deps.mediaReader.read).toHaveBeenCalledWith("message-001");
    expect(deps.expenseParser.fromImage).toHaveBeenCalledOnce();
    expect(deps.expenseParser.fromImage).toHaveBeenCalledWith({
      mimeType: "image/png",
      imageBase64: "encoded-image",
    });
    expect(deps.pendingExpensesRepo.create).toHaveBeenCalledOnce();
    expect(deps.pendingExpensesRepo.create).toHaveBeenCalledWith(
      "user-001",
      EXPENSE,
      "event-001",
    );
  });
});
