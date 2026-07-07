import {
  DEFAULT_USER_ERROR_TEXT,
  handleError,
} from "#api/_lib/handle-error.js";
import type { PendingExpense } from "#shared/model/pending-expense.js";
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
};

export async function respondToConfirmation({
  userId,
  isApproved,
  pendingWebhookEventId,
  reply,
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
      notify: () => reply.send(DEFAULT_USER_ERROR_TEXT),
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
      await handleError({
        error,
        label: "expensesRepo.createFromPending",
        notify: () =>
          reply.send("登録に失敗しました。もう一度お試しください。"),
      });
      return;
    }
    await reply.send("登録しました！");
    return;
  }

  try {
    await pendingExpensesRepo.delete(userId, pendingExpense.webhookEventId);
  } catch (error) {
    await handleError({
      error,
      label: "pendingExpensesRepo.delete",
      notify: () => reply.send(DEFAULT_USER_ERROR_TEXT),
    });
    return;
  }
  await reply.send("キャンセルしました。");
}
