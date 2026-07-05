import type { MediaReader } from "../../_usecases/_ports/media-reader.js";
import {
  createLineReply,
  getImageContent,
  parseWebhookEvents,
} from "./line.js";

export type { WebhookEvent } from "./line.js";
export const createReply = createLineReply;
export const mediaReader: MediaReader = { read: getImageContent };
export { parseWebhookEvents };
