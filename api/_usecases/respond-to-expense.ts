import {
  getPendingExpense,
  upsertPendingExpense,
} from "../../shared/db/pending_expenses.js";
import { parseExpense } from "../_lib/ai.js";
import { replyText, replyWithQuickReply } from "../_lib/messaging/index.js";

const CONFIRMATION_QUICK_REPLY_ITEMS = [
  {
    type: "action" as const,
    action: {
      type: "postback" as const,
      label: "はい",
      data: "ok",
      displayText: "はい",
    },
  },
  {
    type: "action" as const,
    action: {
      type: "postback" as const,
      label: "いいえ",
      data: "ng",
      displayText: "いいえ",
    },
  },
];

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
  const hasPendingExpense = !!(await getPendingExpense(userId));
  if (hasPendingExpense) {
    await replyText(
      replyToken,
      "先に確認中の支出を「はい」か「いいえ」で回答してください。",
    );
    return;
  }

  const expense = await parseExpense(text);
  console.log("parsed expense:", expense);

  await upsertPendingExpense(userId, expense, webhookEventId);

  const reply = `${expense.date}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。よろしいですか？`;
  await replyWithQuickReply(replyToken, reply, CONFIRMATION_QUICK_REPLY_ITEMS);
}
