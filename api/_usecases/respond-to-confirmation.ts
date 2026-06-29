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
  const pendingExpense = await pendingExpensesRepo.get(userId);
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
    await expensesRepo.createFromPending(userId, pendingExpense);
    await messaging.replyText({ replyToken, text: "登録しました！" });
    return;
  }

  await pendingExpensesRepo.delete(userId, pendingExpense.webhookEventId);
  await messaging.replyText({ replyToken, text: "キャンセルしました。" });
}
