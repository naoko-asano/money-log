import { describe, expect, it, vi } from "vitest";
import type { ExpensesRepo } from "./_ports/expenses-repo";
import type { Messaging } from "./_ports/messaging";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo";
import { respondToExpense } from "./respond-to-expense";

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
  replyToken: "reply-token",
  webhookEventId: "event-001",
};

function createMessaging(): Messaging {
  return {
    replyText: vi.fn().mockResolvedValue(undefined),
    replyWithQuickReply: vi.fn().mockResolvedValue(undefined),
  };
}

function createExpensesRepo(
  overrides: Partial<ExpensesRepo> = {},
): ExpensesRepo {
  return {
    exists: vi.fn().mockResolvedValue(false),
    create: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

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
    const messaging = createMessaging();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      messaging,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo,
    });

    expect(pendingExpensesRepo.create).toHaveBeenCalledOnce();
    expect(messaging.replyWithQuickReply).toHaveBeenCalledOnce();
    expect(messaging.replyText).not.toHaveBeenCalled();
  });

  it("確認待ちの支出がある場合、確認メッセージを送信する", async () => {
    const messaging = createMessaging();
    const parseInput = vi.fn();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput,
      messaging,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
      }),
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(messaging.replyWithQuickReply).toHaveBeenCalledOnce();
    expect(messaging.replyText).not.toHaveBeenCalled();
  });

  it("同じ webhookEventId の支出が既に存在する場合、何も送信しない", async () => {
    const messaging = createMessaging();
    const parseInput = vi.fn();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput,
      messaging,
      expensesRepo: createExpensesRepo({
        exists: vi.fn().mockResolvedValue(true),
      }),
      pendingExpensesRepo: createPendingExpensesRepo(),
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(messaging.replyText).not.toHaveBeenCalled();
    expect(messaging.replyWithQuickReply).not.toHaveBeenCalled();
  });

  it("入力の解析に失敗した場合、エラーメッセージを送信する", async () => {
    const messaging = createMessaging();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockRejectedValue(new Error("parse error")),
      messaging,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo,
    });

    expect(pendingExpensesRepo.create).not.toHaveBeenCalled();
    expect(messaging.replyText).toHaveBeenCalledWith({
      replyToken: "reply-token",
      text: "解析できませんでした。もう一度お試しください。",
    });
    expect(messaging.replyWithQuickReply).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合した場合、既存の確認メッセージを送信する", async () => {
    const messaging = createMessaging();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      messaging,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(PENDING_EXPENSE),
      }),
    });

    expect(messaging.replyWithQuickReply).toHaveBeenCalledOnce();
    expect(messaging.replyText).not.toHaveBeenCalled();
  });
});
