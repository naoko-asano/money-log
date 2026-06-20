import { upsertPendingExpense } from "../../shared/db/pending_expenses.js";
import { parseExpense } from "./ai.js";
import { replyWithConfirmButtons } from "./messaging/index.js";

type Args = {
  userId: string;
  replyToken: string;
  text: string;
  webhookEventId: string;
};

export async function respondToExpense({
  userId,
  replyToken,
  text,
  webhookEventId,
}: Args): Promise<void> {
  const expense = await parseExpense(text);
  console.log("parsed expense:", expense);

  await upsertPendingExpense(userId, expense, webhookEventId);

  const reply = `${expense.date}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。よろしいですか？`;
  await replyWithConfirmButtons(replyToken, reply);
}
