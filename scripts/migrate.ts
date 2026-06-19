import { sql } from "../shared/db/client";

(async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      line_user_id TEXT NOT NULL,
      date DATE NOT NULL,
      amount INTEGER NOT NULL,
      category TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  console.log("Done: expenses table created.");
})();
