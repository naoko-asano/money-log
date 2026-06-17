import type { webhook } from "@line/bot-sdk";
import { parseExpense } from "./_lib/ai.js";
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
    if (event.type !== "message" || event.message.type !== "text") {
      continue;
    }

    const text = event.message.text;
    console.log("LINE message:", text);

    const today = new Date().toISOString().slice(0, 10);
    const expense = await parseExpense(text, today);
    console.log("parsed expense:", expense);
  }

  return new Response(null, { status: 200 });
}
