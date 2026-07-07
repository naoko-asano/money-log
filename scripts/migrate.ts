import { sql } from "#shared/db/client.js";

(async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      line_user_id TEXT NOT NULL,
      date DATE NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      webhook_event_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pending_expenses (
      id SERIAL PRIMARY KEY,
      line_user_id TEXT NOT NULL UNIQUE,
      date DATE NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      webhook_event_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Done: expenses, pending_expenses tables created.");
})();
