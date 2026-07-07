import type { Readable } from "node:stream";
import { messagingApi } from "@line/bot-sdk";
import type { MediaReader } from "#api/_usecases/_ports/media-reader.js";
import { getToken } from "./token.js";

export const getImageContent: MediaReader["read"] = async (messageId) => {
  const client = createBlobClient();
  const { httpResponse, body } =
    await client.getMessageContentWithHttpInfo(messageId);
  const mimeType = httpResponse.headers.get("content-type") ?? "image/jpeg";
  const imageBase64 = await streamToBase64(body);
  return { mimeType, imageBase64 };
};

function createBlobClient(): messagingApi.MessagingApiBlobClient {
  return new messagingApi.MessagingApiBlobClient({
    channelAccessToken: getToken(),
  });
}

async function streamToBase64(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("base64");
}
