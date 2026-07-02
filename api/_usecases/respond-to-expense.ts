import type { Expense } from "../../shared/model/expense.js";
import type { PendingExpense } from "../../shared/model/pending-expense.js";
import { formatDate } from "../../shared/utils/date.js";
import { DEFAULT_USER_ERROR_TEXT, handleError } from "../_lib/handle-error.js";
import type { ExpensesRepo } from "./_ports/expenses-repo.js";
import type { Messaging } from "./_ports/messaging.js";
import type { PendingExpensesRepo } from "./_ports/pending-expenses-repo.js";

type Args = {
  userId: string;
  replyToken: string;
  webhookEventId: string;
  parseInput: () => Promise<Expense>;
  messaging: Messaging;
  expensesRepo: ExpensesRepo;
  pendingExpensesRepo: PendingExpensesRepo;
};

export async function respondToExpense({
  userId,
  replyToken,
  webhookEventId,
  parseInput,
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

  if (pendingExpense) {
    await askForConfirmation({
      expense: pendingExpense,
      replyToken,
      hasPendingExpense: true,
      messaging,
    });
    return;
  }

  // NOTE: 再送を考慮
  try {
    if (await expensesRepo.exists(webhookEventId)) return;
  } catch (error) {
    await handleError({
      error,
      label: "expensesRepo.exists",
      notify: () =>
        messaging.replyText({
          replyToken,
          text: DEFAULT_USER_ERROR_TEXT,
        }),
    });
    return;
  }

  let expense: Expense;
  try {
    expense = await parseInput();
  } catch (error) {
    await handleError({
      error,
      label: "parseInput",
      notify: () =>
        messaging.replyText({
          replyToken,
          text: "解析できませんでした。もう一度お試しください。",
        }),
    });
    return;
  }
  console.log("parsed expense:", expense);

  let created: PendingExpense | null;
  try {
    created = await pendingExpensesRepo.create(userId, expense, webhookEventId);
  } catch (error) {
    await handleError({
      error,
      label: "pendingExpensesRepo.create",
      notify: () =>
        messaging.replyText({
          replyToken,
          text: DEFAULT_USER_ERROR_TEXT,
        }),
    });
    return;
  }
  if (created) {
    await askForConfirmation({
      expense: created,
      replyToken,
      hasPendingExpense: false,
      messaging,
    });
    return;
  }

  let existing: PendingExpense | null;
  try {
    existing = await pendingExpensesRepo.get(userId);
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
  if (existing) {
    await askForConfirmation({
      expense: existing,
      replyToken,
      hasPendingExpense: true,
      messaging,
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
  messaging,
}: {
  expense: PendingExpense;
  replyToken: string;
  hasPendingExpense: boolean;
  messaging: Messaging;
}): Promise<void> {
  const items = buildConfirmationItems(expense.webhookEventId);
  const baseReply = `${formatDate(expense.date)}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。\nよろしいですか？`;
  const reply = hasPendingExpense
    ? `先に確認中の支出を「はい」か「いいえ」で回答してください。\n${baseReply}`
    : baseReply;

  await messaging.replyWithQuickReply({
    replyToken,
    text: reply,
    items,
  });
}
