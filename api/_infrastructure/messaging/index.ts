import type { MediaReader } from "#api/_usecases/_ports/media-reader.js";
import { getImageContent } from "./line/media-reader.js";
import { createLineReply } from "./line/reply.js";
import { parseWebhookEvents } from "./line/webhook-events.js";

export type { WebhookEvent } from "./line/webhook-events.js";
export const createReply = createLineReply;
export const mediaReader: MediaReader = { read: getImageContent };
export { parseWebhookEvents };
