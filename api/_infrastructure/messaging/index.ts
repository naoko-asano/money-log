import type { MediaReader } from "../../_usecases/_ports/media-reader.js";
import type { Messaging } from "../../_usecases/_ports/messaging.js";
import { getImageContent, replyText, replyWithQuickReply } from "./line.js";

export const messaging: Messaging = { replyText, replyWithQuickReply };
export const mediaReader: MediaReader = { read: getImageContent };
