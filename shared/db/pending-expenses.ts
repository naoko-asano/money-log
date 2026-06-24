import type { Category, Expense } from "../model/expense.js";
import type { PendingExpense } from "../model/pending-expense.js";
import { sql } from "./client.js";

export type { PendingExpense };

export async function getPendingExpense(
  userId: string,
): Promise<PendingExpense | null> {
  const [row] = await sql`
    SELECT date, amount, category, webhook_event_id
    FROM pending_expenses
    WHERE line_user_id = ${userId}
    LIMIT 1
  `;
  if (!row) return null;
  return {
    date: row.date as Date,
    amount: row.amount as number,
    category: row.category as Category,
    webhookEventId: row.webhook_event_id as string,
  };
}

export async function createPendingExpense(
  userId: string,
  expense: Expense,
  webhookEventId: string,
): Promise<PendingExpense | null> {
  const [row] = await sql`
    INSERT INTO pending_expenses (line_user_id, date, amount, category, webhook_event_id)
    VALUES (${userId}, ${expense.date}, ${expense.amount}, ${expense.category}, ${webhookEventId})
    ON CONFLICT (line_user_id) DO NOTHING
    RETURNING date, amount, category, webhook_event_id
  `;
  if (!row) return null;
  return {
    date: row.date as Date,
    amount: row.amount as number,
    category: row.category as Category,
    webhookEventId: row.webhook_event_id as string,
  };
}

export async function deletePendingExpense(
  userId: string,
  webhookEventId: string,
): Promise<void> {
  await sql`
    DELETE FROM pending_expenses
    WHERE line_user_id = ${userId} AND webhook_event_id = ${webhookEventId}
  `;
}
