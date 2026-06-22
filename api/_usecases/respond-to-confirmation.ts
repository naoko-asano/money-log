import { createExpense } from "../../shared/db/expenses.js";
import {
  deletePendingExpense,
  getPendingExpense,
} from "../../shared/db/pending-expenses.js";
import { replyText } from "../_lib/messaging/index.js";

type Args = {
  userId: string;
  replyToken: string;
  isApproved: boolean;
  pendingWebhookEventId: string;
};

export async function respondToConfirmation({
  userId,
  replyToken,
  isApproved,
  pendingWebhookEventId,
}: Args): Promise<void> {
  const pendingExpense = await getPendingExpense(userId);
  if (!pendingExpense) {
    await replyText({ replyToken, text: "確認待ちの支出はありません。" });
    return;
  }

  if (pendingExpense.webhookEventId !== pendingWebhookEventId) return;

  if (isApproved) {
    await createExpense(userId, pendingExpense, pendingExpense.webhookEventId);
    await deletePendingExpense(userId);
    await replyText({ replyToken, text: "登録しました！" });
    return;
  }

  await deletePendingExpense(userId);
  await replyText({ replyToken, text: "キャンセルしました。" });
}
