import type { PendingExpense } from "../../../shared/model/pending-expense.js";

export type ExpensesRepo = {
  exists(webhookEventId: string): Promise<boolean>;
  create(userId: string, pending: PendingExpense): Promise<void>;
};
