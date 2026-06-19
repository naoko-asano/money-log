import { messagingApi } from "@line/bot-sdk";

function createClient(): messagingApi.MessagingApiClient {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  return new messagingApi.MessagingApiClient({ channelAccessToken: token });
}

export async function replyText(
  replyToken: string,
  text: string,
): Promise<void> {
  const client = createClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}
