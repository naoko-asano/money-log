import { describe, expect, it, vi } from "vitest";
import { createMockedErrorHandler } from "#api/_test-utils/error-handler.js";
import { createMockedExpensesRepo } from "#api/_test-utils/expenses-repo.js";
import { createMockedReply } from "#api/_test-utils/reply.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo";
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

function createMockedPendingExpensesRepo(
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
    const reply = createMockedReply();
    const expensesRepo = createMockedExpensesRepo();
    const pendingExpensesRepo = createMockedPendingExpensesRepo();
    const errorHandler = createMockedErrorHandler();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo,
      errorHandler,
    });

    expect(expensesRepo.createFromPending).toHaveBeenCalledOnce();
    expect(expensesRepo.createFromPending).toHaveBeenCalledWith(
      "user-001",
      PENDING_EXPENSE,
    );
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("登録しました！");
  });

  it("キャンセルされた場合、支出を削除してメッセージを送信する", async () => {
    const reply = createMockedReply();
    const expensesRepo = createMockedExpensesRepo();
    const pendingExpensesRepo = createMockedPendingExpensesRepo();
    const errorHandler = createMockedErrorHandler();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: false,
      reply,
      expensesRepo,
      pendingExpensesRepo,
      errorHandler,
    });

    expect(pendingExpensesRepo.delete).toHaveBeenCalledOnce();
    expect(pendingExpensesRepo.delete).toHaveBeenCalledWith(
      "user-001",
      "event-001",
    );
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("キャンセルしました。");
  });

  it("確認待ちの支出がない場合、エラーメッセージを送信する", async () => {
    const reply = createMockedReply();
    const expensesRepo = createMockedExpensesRepo();
    const errorHandler = createMockedErrorHandler();

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo: createMockedPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(null),
      }),
      errorHandler,
    });

    expect(reply.send).toHaveBeenCalledOnce();
    expect(reply.send).toHaveBeenCalledWith("確認待ちの支出はありません。");
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
  });

  it("確認待ち支出の取得に失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const expensesRepo = createMockedExpensesRepo();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo: createMockedPendingExpensesRepo({
        get: vi.fn().mockRejectedValue(error),
      }),
      errorHandler,
    });

    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "pendingExpensesRepo.get",
      reply,
    });
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
  });

  it("承認時にDBへの書き込みに失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      reply,
      expensesRepo: createMockedExpensesRepo({
        createFromPending: vi.fn().mockRejectedValue(error),
      }),
      pendingExpensesRepo: createMockedPendingExpensesRepo(),
      errorHandler,
    });

    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "expensesRepo.createFromPending",
      reply,
      userText: "登録に失敗しました。もう一度お試しください。",
    });
  });

  it("キャンセル時にDBの削除に失敗した場合、エラーハンドラーを呼び出す", async () => {
    const reply = createMockedReply();
    const errorHandler = createMockedErrorHandler();
    const error = new Error("db error");

    await handleConfirmation({
      ...BASE_ARGS,
      isApproved: false,
      reply,
      expensesRepo: createMockedExpensesRepo(),
      pendingExpensesRepo: createMockedPendingExpensesRepo({
        delete: vi.fn().mockRejectedValue(error),
      }),
      errorHandler,
    });

    expect(errorHandler.run).toHaveBeenCalledOnce();
    expect(errorHandler.run).toHaveBeenCalledWith({
      error,
      label: "pendingExpensesRepo.delete",
      reply,
    });
  });

  it("異なる webhookEventId の場合、何もしない", async () => {
    const reply = createMockedReply();
    const expensesRepo = createMockedExpensesRepo();
    const pendingExpensesRepo = createMockedPendingExpensesRepo();
    const errorHandler = createMockedErrorHandler();

    await handleConfirmation({
      ...BASE_ARGS,
      pendingWebhookEventId: "different-event",
      isApproved: true,
      reply,
      expensesRepo,
      pendingExpensesRepo,
      errorHandler,
    });

    expect(reply.send).not.toHaveBeenCalled();
    expect(expensesRepo.createFromPending).not.toHaveBeenCalled();
    expect(pendingExpensesRepo.delete).not.toHaveBeenCalled();
  });
});
