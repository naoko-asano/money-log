import type { Expense } from "../model/expense.js";
import { sql } from "./client.js";

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
