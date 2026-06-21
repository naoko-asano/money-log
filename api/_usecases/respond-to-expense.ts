import {
  createPendingExpense,
  getPendingExpense,
} from "../../shared/db/pending-expenses.js";
import type { Expense } from "../../shared/model/expense.js";
import { parseExpense } from "../_lib/ai.js";
import { replyWithQuickReply } from "../_lib/messaging/index.js";

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

async function askForConfirmation({
  expense,
  replyToken,
  hasPendingExpense,
}: {
  expense: Expense;
  replyToken: string;
  hasPendingExpense: boolean;
}): Promise<void> {
  const baseReply = `${expense.date}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。\nよろしいですか？`;
  const reply = hasPendingExpense
    ? `先に確認中の支出を「はい」か「いいえ」で回答してください。\n${baseReply}`
    : baseReply;
  await replyWithQuickReply({
    replyToken,
    text: reply,
    items: CONFIRMATION_QUICK_REPLY_ITEMS,
  });
}

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
  const pendingExpense = await getPendingExpense(userId);

  if (pendingExpense) {
    await askForConfirmation({
      expense: pendingExpense,
      replyToken,
      hasPendingExpense: true,
    });
    return;
  }

  const expense = await parseExpense(text);
  console.log("parsed expense:", expense);
  const created = await createPendingExpense(userId, expense, webhookEventId);
  if (created) {
    await askForConfirmation({
      expense: created,
      replyToken,
      hasPendingExpense: false,
    });
    return;
  }

  const existing = await getPendingExpense(userId);
  if (existing) {
    await askForConfirmation({
      expense: existing,
      replyToken,
      hasPendingExpense: true,
    });
  }
}
