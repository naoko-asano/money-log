import type { Expense } from "../model/expense.js";
import { sql } from "./client.js";

export async function existsExpenseByWebhookEventId(
  webhookEventId: string,
): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM expenses WHERE webhook_event_id = ${webhookEventId} LIMIT 1
  `;
  return row != null;
}

export async function createExpense(
  userId: string,
  expense: Expense,
  webhookEventId: string,
): Promise<void> {
  await sql`
    INSERT INTO expenses (line_user_id, date, amount, category, webhook_event_id)
    VALUES (${userId}, ${expense.date}, ${expense.amount}, ${expense.category}, ${webhookEventId})
    ON CONFLICT (webhook_event_id) DO NOTHING
  `;
}
