import type { Expense } from "./expense.js";

export type PendingExpense = Expense & { webhookEventId: string };
