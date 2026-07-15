import { describe, expect, it, vi } from "vitest";
import { createMockedErrorHandler } from "#api/_test-utils/error-handler.js";
import { createMockedExpensesRepo } from "#api/_test-utils/expenses-repo.js";
import { createMockedReply } from "#api/_test-utils/reply.js";
import type { MediaReader } from "#api/_usecases/_ports/media-reader.js";
import type { PendingExpensesRepo } from "#api/_usecases/_ports/pending-expenses-repo.js";
import { buildConfirmationItems } from "#api/_usecases/confirmation-payload.js";
import type { ExpenseParser } from "#api/_usecases/parse-expense.js";
import { handleWebhookEvent } from "./handle-webhook-event";

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

describe("confirmationイベントを受け取った場合", () => {
  it("有効なpayloadの場合、確認結果に応じて支出を登録する", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const expensesRepo = createMockedExpensesRepo();
    const pendingExpensesRepo = createMockedPendingExpensesRepo({
      get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    });

    await handleWebhookEvent(
      {
        ...BASE_EVENT,
        type: "confirmation",
        confirmationPayload: buildConfirmationItems("event-001")[0].data,
      },
      {
        reply,
        errorHandler,
        expenseParser: createMockedExpenseParser(),
        mediaReader: createMockedMediaReader(),
        expensesRepo,
        pendingExpensesRepo,
      },
    );

    expect(expensesRepo.createFromPending).toHaveBeenCalledOnce();
    expect(expensesRepo.createFromPending).toHaveBeenCalledWith(
      "user-001",
      PENDING_EXPENSE,
    );
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("登録しました！");
  });

  it("不正なpayloadの場合、エラーハンドラーを呼び出し、支出登録の処理は行わない", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const expensesRepo = createMockedExpensesRepo();
    const pendingExpensesRepo = createMockedPendingExpensesRepo();

    await handleWebhookEvent(
      {
        ...BASE_EVENT,
        type: "confirmation",
        confirmationPayload: "not json",
      },
      {
        reply,
        errorHandler,
        expenseParser: createMockedExpenseParser(),
        mediaReader: createMockedMediaReader(),
        expensesRepo,
        pendingExpensesRepo,
      },
    );

    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error: expect.any(Error),
      label: "parseConfirmationPayload",
      reply,
    });
    expect(pendingExpensesRepo.get).not.toHaveBeenCalled();
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
  });
});

describe("textイベントを受け取った場合", () => {
  it("入力されたテキストを解析して確認待ち支出を作成する", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const pendingExpensesRepo = createMockedPendingExpensesRepo();
    const expenseParser = createMockedExpenseParser();

    await handleWebhookEvent(
      { ...BASE_EVENT, type: "text", text: "コーヒー 500円" },
      {
        reply,
        errorHandler,
        expenseParser,
        mediaReader: createMockedMediaReader(),
        expensesRepo: createMockedExpensesRepo(),
        pendingExpensesRepo,
      },
    );

    expect(expenseParser.fromText).toHaveBeenCalledOnce();
    expect(expenseParser.fromText).toHaveBeenCalledWith("コーヒー 500円");
    expect(pendingExpensesRepo.create).toHaveBeenCalledOnce();
    expect(pendingExpensesRepo.create).toHaveBeenCalledWith(
      "user-001",
      EXPENSE,
      "event-001",
    );
    expect(reply.sendWithQuickItems).toHaveBeenCalledOnce();
    expect(reply.sendWithQuickItems).toHaveBeenCalledWith(
      expect.not.stringContaining(
        "先に確認中の支出を「はい」か「いいえ」で回答してください。",
      ),
      expect.any(Array),
    );
  });
});

describe("imageイベントを受け取った場合", () => {
  it("画像を取得して解析し、確認待ち支出を作成する", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const pendingExpensesRepo = createMockedPendingExpensesRepo();
    const expenseParser = createMockedExpenseParser();
    const mediaReader = createMockedMediaReader({
      read: vi.fn().mockResolvedValue({
        mimeType: "image/png",
        imageBase64: "encoded-image",
      }),
    });

    await handleWebhookEvent(
      { ...BASE_EVENT, type: "image", messageId: "message-001" },
      {
        reply,
        errorHandler,
        expenseParser,
        mediaReader,
        expensesRepo: createMockedExpensesRepo(),
        pendingExpensesRepo,
      },
    );

    expect(mediaReader.read).toHaveBeenCalledOnce();
    expect(mediaReader.read).toHaveBeenCalledWith("message-001");
    expect(expenseParser.fromImage).toHaveBeenCalledOnce();
    expect(expenseParser.fromImage).toHaveBeenCalledWith({
      mimeType: "image/png",
      imageBase64: "encoded-image",
    });
    expect(pendingExpensesRepo.create).toHaveBeenCalledOnce();
    expect(pendingExpensesRepo.create).toHaveBeenCalledWith(
      "user-001",
      EXPENSE,
      "event-001",
    );
  });
});
