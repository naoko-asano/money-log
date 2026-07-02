import type { PendingExpense } from "../../shared/model/pending-expense.js";
import { DEFAULT_USER_ERROR_TEXT, handleError } from "../_lib/handle-error.js";
import type { ExpensesRepo } from "./_ports/expenses-repo.js";
import type { Messaging } from "./_ports/messaging.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo.js";

type Args = {
  userId: string;
  replyToken: string;
  isApproved: boolean;
  pendingWebhookEventId: string;
  messaging: Messaging;
  expensesRepo: ExpensesRepo;
  pendingExpensesRepo: PendingExpensesRepo;
};

export async function respondToConfirmation({
  userId,
  replyToken,
  isApproved,
  pendingWebhookEventId,
  messaging,
  expensesRepo,
  pendingExpensesRepo,
}: Args): Promise<void> {
  let pendingExpense: PendingExpense | null;
  try {
    pendingExpense = await pendingExpensesRepo.get(userId);
  } catch (error) {
    await handleError({
      error,
      label: "pendingExpensesRepo.get",
      notify: () =>
        messaging.replyText({
          replyToken,
          text: DEFAULT_USER_ERROR_TEXT,
        }),
    });
    return;
  }

  if (!pendingExpense) {
    await messaging.replyText({
      replyToken,
      text: "確認待ちの支出はありません。",
    });
    return;
  }

  // すでに支出として登録されたあとに、確認ボタンが再送された場合を考慮
  if (pendingExpense.webhookEventId !== pendingWebhookEventId) return;

  if (isApproved) {
    try {
      await expensesRepo.createFromPending(userId, pendingExpense);
    } catch (error) {
      await handleError({
        error,
        label: "expensesRepo.createFromPending",
        notify: () =>
          messaging.replyText({
            replyToken,
            text: "登録に失敗しました。もう一度お試しください。",
          }),
      });
      return;
    }
    await messaging.replyText({ replyToken, text: "登録しました！" });
    return;
  }

  try {
    await pendingExpensesRepo.delete(userId, pendingExpense.webhookEventId);
  } catch (error) {
    await handleError({
      error,
      label: "pendingExpensesRepo.delete",
      notify: () =>
        messaging.replyText({
          replyToken,
          text: DEFAULT_USER_ERROR_TEXT,
        }),
    });
    return;
  }
  await messaging.replyText({ replyToken, text: "キャンセルしました。" });
}
