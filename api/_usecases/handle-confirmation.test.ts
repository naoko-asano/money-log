import { describe, expect, it, vi } from "vitest";
import type { ExpensesRepo } from "./_ports/expenses-repo";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo";
import type { Reply } from "./_ports/reply";
import { handleConfirmation } from "./handle-confirmation";

const PENDING_EXPENSE = {
  date: new Date("2026-01-15"),
  amount: 500,
  category: "食費" as const,
  webhookEventId: "event-001",
};

const BASE_ARGS = {
  userId: "user-001",
  pendingWebhookEventId: "event-001",
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
    get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    create: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("支出登録の確認ボタンが押下された場合", () => {
  it("承認された場合、支出を登録してメッセージを送信する", async () => {
    const reply = createReply();
    const expensesRepo = createExpensesRepo();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo,
    });

    expect(expensesRepo.createFromPending).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("登録しました！");
  });

  it("キャンセルされた場合、支出を削除してメッセージを送信する", async () => {
    const reply = createReply();
    const expensesRepo = createExpensesRepo();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: false,
      reply,
      expensesRepo,
      pendingExpensesRepo,
    });

    expect(pendingExpensesRepo.delete).toHaveBeenCalledOnce();
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("キャンセルしました。");
  });

  it("確認待ちの支出がない場合、エラーメッセージを送信する", async () => {
    const reply = createReply();
    const expensesRepo = createExpensesRepo();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(null),
      }),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("確認待ちの支出はありません。");
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
  });

  it("確認待ち支出の取得に失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();
    const expensesRepo = createExpensesRepo();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockRejectedValue(new Error("db error")),
      }),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
  });

  it("承認時にDBへの書き込みに失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo: createExpensesRepo({
        createFromPending: vi.fn().mockRejectedValue(new Error("db error")),
      }),
      pendingExpensesRepo: createPendingExpensesRepo(),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "登録に失敗しました。もう一度お試しください。",
    );
  });

  it("キャンセル時にDBの削除に失敗した場合、エラーメッセージを送信する", async () => {
    const reply = createReply();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: false,
      reply,
      expensesRepo: createExpensesRepo(),
      pendingExpensesRepo: createPendingExpensesRepo({
        delete: vi.fn().mockRejectedValue(new Error("db error")),
      }),
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith(
      "エラーが発生しました。しばらく経ってからお試しください。",
    );
  });

  it("異なる webhookEventId の場合、何もしない", async () => {
    const reply = createReply();
    const expensesRepo = createExpensesRepo();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await handleConfirmation({
      ...BASE_ARGS,
      pendingWebhookEventId: "different-event",
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo,
    });

    expect(reply.send).not.toHaveBeenCalled();
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
    expect(pendingExpensesRepo.delete).not.toHaveBeenCalled();
  });
});
