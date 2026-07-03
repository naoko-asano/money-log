import { describe, expect, it, vi } from "vitest";
import type { ExpensesRepo } from "./_ports/expenses-repo";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo";
import type { Reply } from "./_ports/reply";
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
  webhookEventId: "event-001",
};

function createReply(): Reply {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendWithQuickItems: vi.fn().mockResolvedValue(undefined),
  };
}

function createExpensesRepo(
  overrides: Partial<ExpensesRepo> = {},
): ExpensesRepo {
  return {
    exists: vi.fn().mockResolvedValue(false),
    createFromPending: vi.fn().mockResolvedValue(undefined),
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
    const reply = createReply();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo,
    });

    expect(pendingExpensesRepo.create).toHaveBeenCalledOnce();
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
    const reply = createReply();
    const parseInput = vi.fn();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
      }),
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
    const reply = createReply();
    const parseInput = vi.fn();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createExpensesRepo({
        exists: vi.fn().mockResolvedValue(true),
      }),
      pendingExpensesRepo: createPendingExpensesRepo(),
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("入力の解析に失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockRejectedValue(new Error("parse error")),
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo,
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "解析できませんでした。もう一度お試しください。",
    );
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の取得に失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();
    const parseInput = vi.fn();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockRejectedValue(new Error("db error")),
      }),
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("支出の存在確認に失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();
    const parseInput = vi.fn();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput,
      reply,
      expensesRepo: createExpensesRepo({
        exists: vi.fn().mockRejectedValue(new Error("db error")),
      }),
      pendingExpensesRepo: createPendingExpensesRepo(),
    });

    expect(parseInput).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成に失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockRejectedValue(new Error("db error")),
      }),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合し、取得にも失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockRejectedValueOnce(new Error("db error")),
      }),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合し、取得でも見つからない場合、エラーメッセージを送信する", async () => {
    const reply = createReply();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      }),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
    expect(reply.sendWithQuickItems).not.toHaveBeenCalled();
  });

  it("確認待ち支出の作成が競合した場合、既存の確認メッセージを送信する", async () => {
    const reply = createReply();

    await respondToExpense({
      ...BASE_ARGS,
      parseInput: vi.fn().mockResolvedValue(EXPENSE),
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        create: vi.fn().mockResolvedValue(null),
        get: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(PENDING_EXPENSE),
      }),
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
});
