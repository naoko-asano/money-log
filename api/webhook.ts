import type { webhook } from "@line/bot-sdk";
import { verifySignature } from "~api/_lib/verify-signature";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const signature = req.headers.get("x-line-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await req.text();
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? "";
  if (!verifySignature(rawBody, signature, channelSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events: webhook.Event[] };
  const events = body.events ?? [];

  for (const event of events) {
    console.log(JSON.stringify(event, null, 2));
  }

  return new Response(null, { status: 200 });
}
