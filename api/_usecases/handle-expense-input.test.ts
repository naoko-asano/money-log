import { describe, expect, it, vi } from "vitest";
import { createMockedErrorHandler } from "#api/_test-utils/error-handler.js";
import { createMockedExpensesRepo } from "#api/_test-utils/expenses-repo.js";
import { createMockedReply } from "#api/_test-utils/reply.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo";
import { handleExpenseInput } from "./handle-expense-input";

const EXPENSE = {
  date: new Date("2026-01-15"),
  amount: 500,
  category: "食費" as const,
};

const PENDING_EXPENSE = {
  ...EXPENSE,
  webhookEventId: "event-001",
};

const BASE_ARGS = {
  userId: "user-001",
  webhookEventId: "event-001",
};

function createPendingExpensesRepo(
  overrides: Partial<PendingExpensesRepo> = {},
): PendingExpensesRepo {
  return {
    get: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("支出が入力された場合", () => {
  it("支出の解析に成功した場合、確認待ち支出を作成して確認メッセージを送信する", async () => {
    const reply = createMockedReply();
    const pendingExpensesRepo = createPendingExpensesRepo();
    const errorHandler = createMockedErrorHandler();

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo,
      errorHandler,
    });

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
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("確認待ちの支出がある場合、確認メッセージを送信する", async () => {
    const reply = createMockedReply();
    const parseInput = vi.fn();
    const errorHandler = createMockedErrorHandler();

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
      }),
      errorHandler,
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(reply.sendWithQuickItems).toHaveBeenCalledOnce();
    expect(reply.sendWithQuickItems).toHaveBeenCalledWith(
      expect.stringContaining(
        "先に確認中の支出を「はい」か「いいえ」で回答してください。",
      ),
      expect.any(Array),
    );
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("同じ webhookEventId の支出が既に存在する場合、何も送信しない", async () => {
    const reply = createMockedReply();
    const parseInput = vi.fn();
    const errorHandler = createMockedErrorHandler();

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createMockedExpensesRepo({
        exists: vi.fn().mockResolvedValue(true),
      }),
      pendingExpensesRepo: createPendingExpensesRepo(),
      errorHandler,
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("入力の解析に失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const pendingExpensesRepo = createPendingExpensesRepo();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("parse error");

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput: vi.fn().mockRejectedValue(error),
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo,
      errorHandler,
    });

    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "parseInput",
      reply,
      userText: "解析できませんでした。もう一度お試しください。",
    });
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の取得に失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const parseInput = vi.fn();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockRejectedValue(error),
      }),
      errorHandler,
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "pendingExpensesRepo.get",
      reply,
    });
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("支出の存在確認に失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const parseInput = vi.fn();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createMockedExpensesRepo({
        exists: vi.fn().mockRejectedValue(error),
      }),
      pendingExpensesRepo: createPendingExpensesRepo(),
      errorHandler,
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "expensesRepo.exists",
      reply,
    });
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成に失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockRejectedValue(error),
      }),
      errorHandler,
    });

    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "pendingExpensesRepo.create",
      reply,
    });
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合した場合、既存の確認メッセージを送信する", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(PENDING_EXPENSE),
      }),
      errorHandler,
    });

    expect(reply.sendWithQuickItems).toHaveBeenCalledOnce();
    expect(reply.sendWithQuickItems).toHaveBeenCalledWith(
      expect.stringContaining(
        "先に確認中の支出を「はい」か「いいえ」で回答してください。",
      ),
      expect.any(Array),
    );
    expect(reply.send).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合し、取得にも失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");
    const getPendingExpense = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(error);

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: getPendingExpense,
      }),
      errorHandler,
    });

    expect(getPendingExpense).toHaveBeenCalledTimes(2);
    expect(getPendingExpense).toHaveBeenCalledWith("user-001");
    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "pendingExpensesRepo.get (conflict recovery)",
      reply,
    });
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合し、取得でも見つからない場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const getPendingExpense = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await handleExpenseInput({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: getPendingExpense,
      }),
      errorHandler,
    });

    expect(getPendingExpense).toHaveBeenCalledTimes(2);
    expect(getPendingExpense).toHaveBeenCalledWith("user-001");
    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error: expect.any(Error),
      label: "pendingExpensesRepo.create (conflict recovery not found)",
      reply,
    });
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });
});
