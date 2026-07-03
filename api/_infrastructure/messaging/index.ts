import type { MediaReader } from "../../_usecases/_ports/media-reader.js";
import { createLineReply, getImageContent } from "./line.js";

export const createReply = createLineReply;
export const mediaReader: MediaReader = { read: getImageContent };
