import { describe, expect, it, vi } from "vitest";
import type { ExpensesRepo } from "./_ports/expenses-repo";
import type { Messaging } from "./_ports/messaging";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo";
import { respondToConfirmation } from "./respond-to-confirmation";

const PENDING_EXPENSE = {
  date: new Date("2026-01-15"),
  amount: 500,
  category: "食費" as const,
  webhookEventId: "event-001",
};

const BASE_ARGS = {
  userId: "user-001",
  replyToken: "reply-token",
  pendingWebhookEventId: "event-001",
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
    get: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    create: vi.fn().mockResolvedValue(PENDING_EXPENSE),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("支出登録の確認ボタンが押下された場合", () => {
  it("承認された場合、支出を登録してメッセージを送信する", async () => {
    const messaging = createMessaging();
    const expensesRepo = createExpensesRepo();

    await respondToConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      messaging,
      expensesRepo,
      pendingExpensesRepo: createPendingExpensesRepo(),
    });

    expect(expensesRepo.create).toHaveBeenCalledOnce();
    expect(messaging.replyText).toHaveBeenCalledOnce();
    expect(messaging.replyText).toHaveBeenCalledWith({
      replyToken: "reply-token",
      text: "登録しました！",
    });
  });

  it("キャンセルされた場合、支出を削除してメッセージを送信する", async () => {
    const messaging = createMessaging();
    const expensesRepo = createExpensesRepo();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await respondToConfirmation({
      ...BASE_ARGS,
      isApproved: false,
      messaging,
      expensesRepo,
      pendingExpensesRepo,
    });

    expect(pendingExpensesRepo.delete).toHaveBeenCalledOnce();
    expect(expensesRepo.create).not.toHaveBeenCalled();
    expect(messaging.replyText).toHaveBeenCalledOnce();
    expect(messaging.replyText).toHaveBeenCalledWith({
      replyToken: "reply-token",
      text: "キャンセルしました。",
    });
  });

  it("確認待ちの支出がない場合、エラーメッセージを送信する", async () => {
    const messaging = createMessaging();
    const expensesRepo = createExpensesRepo();

    await respondToConfirmation({
      ...BASE_ARGS,
      isApproved: true,
      messaging,
      expensesRepo,
      pendingExpensesRepo: createPendingExpensesRepo({
        get: vi.fn().mockResolvedValue(null),
      }),
    });

    expect(messaging.replyText).toHaveBeenCalledOnce();
    expect(messaging.replyText).toHaveBeenCalledWith({
      replyToken: "reply-token",
      text: "確認待ちの支出はありません。",
    });
    expect(expensesRepo.create).not.toHaveBeenCalled();
  });

  it("異なる webhookEventId の場合、何もしない", async () => {
    const messaging = createMessaging();
    const expensesRepo = createExpensesRepo();
    const pendingExpensesRepo = createPendingExpensesRepo();

    await respondToConfirmation({
      ...BASE_ARGS,
      pendingWebhookEventId: "different-event",
      isApproved: true,
      messaging,
      expensesRepo,
      pendingExpensesRepo,
    });

    expect(messaging.replyText).not.toHaveBeenCalled();
    expect(expensesRepo.create).not.toHaveBeenCalled();
    expect(pendingExpensesRepo.delete).not.toHaveBeenCalled();
  });
});
