import type { webhook } from "@line/bot-sdk";
import { createExpense } from "../shared/db/expenses.js";
import {
  deletePendingExpense,
  getPendingExpense,
  upsertPendingExpense,
} from "../shared/db/pending_expenses.js";
import { parseExpense } from "./_lib/ai.js";
import { replyText, replyWithConfirmButtons } from "./_lib/messaging/index.js";
import { verifySignature } from "./_lib/verify-signature.js";

export async function POST(req: Request): Promise<Response> {
  const signature = req.headers.get("x-line-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return new Response("Server misconfiguration", { status: 500 });
  }

  const rawBody = await req.text();
  if (!verifySignature(rawBody, signature, channelSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events: webhook.Event[] };

  for (const event of body.events ?? []) {
    const userId = event.source?.userId;
    if (!userId) continue;

    if (event.type === "postback") {
      if (!event.replyToken) continue;
      const data = event.postback.data;

      if (data === "ok") {
        const pending = await getPendingExpense(userId);
        if (pending) {
          await createExpense(userId, pending, pending.webhookEventId);
          await deletePendingExpense(userId);
          await replyText(event.replyToken, "登録しました！");
        } else {
          await replyText(event.replyToken, "登録待ちの費用はありません。");
        }
      } else if (data === "ng") {
        const pending = await getPendingExpense(userId);
        if (pending) {
          await deletePendingExpense(userId);
          await replyText(event.replyToken, "キャンセルしました。");
        } else {
          await replyText(event.replyToken, "キャンセルする費用はありません。");
        }
      }
      continue;
    }

    if (event.type !== "message" || event.message.type !== "text") {
      continue;
    }

    if (!event.replyToken) continue;

    const text = event.message.text;
    const today = new Date().toISOString().slice(0, 10);
    const expense = await parseExpense(text, today);
    console.log("parsed expense:", expense);

    await upsertPendingExpense(userId, expense, event.webhookEventId);

    const reply = `${expense.date}\n${expense.category}: ${expense.amount.toLocaleString("ja-JP")}円\nで登録します。よろしいですか？`;
    await replyWithConfirmButtons(event.replyToken, reply);
  }

  return new Response(null, { status: 200 });
}
