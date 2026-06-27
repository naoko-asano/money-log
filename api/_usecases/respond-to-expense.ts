import { existsExpenseByWebhookEventId } from "../../shared/db/expenses.js";
import {
  createPendingExpense,
  getPendingExpense,
} from "../../shared/db/pending-expenses.js";
import type { Expense } from "../../shared/model/expense.js";
import type { PendingExpense } from "../../shared/model/pending-expense.js";
import { formatDate } from "../../shared/utils/date.js";
import { replyText, replyWithQuickReply } from "../_lib/messaging/index.js";

type Args = {
  userId: string;
  replyToken: string;
  webhookEventId: string;
  parseInput: () => Promise<Expense>;
};

export async function respondToExpense({
  userId,
  replyToken,
  webhookEventId,
  parseInput,
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

  // NOTE: 再送を考慮
  if (await existsExpenseByWebhookEventId(webhookEventId)) return;

  let expense: Expense;
  try {
    expense = await parseInput();
  } catch (e) {
    console.error("parseInput failed:", e);
    await replyText({
      replyToken,
      text: "解析できませんでした。もう一度お試しください。",
    });
    return;
  }
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

function buildConfirmationItems(pendingWebhookEventId: string) {
  return [
    {
      type: "action" as const,
      action: {
        type: "postback" as const,
        label: "はい",
        data: JSON.stringify({ action: "ok", pendingWebhookEventId }),
        displayText: "はい",
      },
    },
    {
      type: "action" as const,
      action: {
        type: "postback" as const,
        label: "いいえ",
        data: JSON.stringify({ action: "ng", pendingWebhookEventId }),
        displayText: "いいえ",
      },
    },
  ];
}

async function askForConfirmation({
  expense,
  replyToken,
  hasPendingExpense,
}: {
  expense: PendingExpense;
  replyToken: string;
  hasPendingExpense: boolean;
}): Promise<void> {
  const items = buildConfirmationItems(expense.webhookEventId);
  const baseReply = `${formatDate(expense.date)}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。\nよろしいですか？`;
  const reply = hasPendingExpense
    ? `先に確認中の支出を「はい」か「いいえ」で回答してください。\n${baseReply}`
    : baseReply;
  await replyWithQuickReply({
    replyToken,
    text: reply,
    items,
  });
}
