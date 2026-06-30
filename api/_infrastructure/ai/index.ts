import type { Ai } from "../../_usecases/_ports/ai.js";
import { askAi } from "./gemini.js";

export const ai: Ai = { ask: askAi };
