import type { ExpenseRecord } from "../../api/_lib/ai.js";
import { sql } from "./client.js";

export type PendingExpense = ExpenseRecord & { webhookEventId: string };

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
    date: row.date as string,
    amount: row.amount as number,
    category: row.category as string,
    webhookEventId: row.webhook_event_id as string,
  };
}

export async function upsertPendingExpense(
  userId: string,
  expense: ExpenseRecord,
  webhookEventId: string,
): Promise<void> {
  await sql`
    INSERT INTO pending_expenses (line_user_id, date, amount, category, webhook_event_id)
    VALUES (${userId}, ${expense.date}, ${expense.amount}, ${expense.category}, ${webhookEventId})
    ON CONFLICT (line_user_id) DO UPDATE
      SET date = EXCLUDED.date,
          amount = EXCLUDED.amount,
          category = EXCLUDED.category,
          webhook_event_id = EXCLUDED.webhook_event_id,
          created_at = NOW()
  `;
}

export async function deletePendingExpense(userId: string): Promise<void> {
  await sql`
    DELETE FROM pending_expenses WHERE line_user_id = ${userId}
  `;
}
