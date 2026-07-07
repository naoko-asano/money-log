import type { Ai } from "#api/_usecases/_ports/ai.js";
import { generateText } from "./gemini.js";

export const ai: Ai = { generateText };
