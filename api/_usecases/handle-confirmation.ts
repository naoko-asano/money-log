import type { PendingExpense } from "#shared/model/pending-expense.js";
import type { ErrorHandler } from "./_ports/error-handler.js";
import type { ExpensesRepo } from "./_ports/expenses-repo.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo.js";
import type { Reply } from "./_ports/reply.js";

type Args = {
  userId: string;
  isApproved: boolean;
  pendingWebhookEventId: string;
  reply: Reply;
  expensesRepo: ExpensesRepo;
  pendingExpensesRepo: PendingExpensesRepo;
  errorHandler: ErrorHandler;
};

export async function handleConfirmation({
  userId,
  isApproved,
  pendingWebhookEventId,
  reply,
  expensesRepo,
  pendingExpensesRepo,
  errorHandler,
}: Args): Promise<void> {
  let pendingExpense: PendingExpense | null;
  try {
    pendingExpense = await pendingExpensesRepo.get(userId);
  } catch (error) {
    await errorHandler.run({
      error,
      label: "pendingExpensesRepo.get",
      reply,
    });
    return;
  }

  if (!pendingExpense) {
    await reply.send("確認待ちの支出はありません。");
    return;
  }

  // すでに支出として登録されたあとに、確認ボタンが再送された場合を考慮
  if (pendingExpense.webhookEventId !== pendingWebhookEventId) return;

  if (isApproved) {
    try {
      await expensesRepo.createFromPending(userId, pendingExpense);
    } catch (error) {
      await errorHandler.run({
        error,
        label: "expensesRepo.createFromPending",
        reply,
        userText: "登録に失敗しました。もう一度お試しください。",
      });
      return;
    }
    await reply.send("登録しました！");
    return;
  }

  try {
    await pendingExpensesRepo.delete(userId, pendingExpense.webhookEventId);
  } catch (error) {
    await errorHandler.run({
      error,
      label: "pendingExpensesRepo.delete",
      reply,
    });
    return;
  }
  await reply.send("キャンセルしました。");
}
