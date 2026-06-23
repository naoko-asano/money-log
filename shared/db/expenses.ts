import type { PendingExpense } from "../model/pending-expense.js";
import { sql } from "./client.js";

export async function existsExpenseByWebhookEventId(
  webhookEventId: string,
): Promise<boolean> {
  const [row] = await sql`
    SELECT 1 FROM expenses WHERE webhook_event_id = ${webhookEventId} LIMIT 1
  `;
  return row != null;
}

export async function createExpenseFromPending(
  userId: string,
  pending: PendingExpense,
): Promise<void> {
  await sql.transaction([
    sql`
      INSERT INTO expenses (line_user_id, date, amount, category, webhook_event_id)
      VALUES (${userId}, ${pending.date}, ${pending.amount}, ${pending.category}, ${pending.webhookEventId})
      ON CONFLICT (webhook_event_id) DO NOTHING
    `,
    sql`
      DELETE FROM pending_expenses
      WHERE line_user_id = ${userId} AND webhook_event_id = ${pending.webhookEventId}
    `,
  ]);
}
