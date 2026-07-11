import { vi } from "vitest";
import type { Reply } from "#api/_usecases/_ports/reply.js";

export function createMockedReply(): Reply {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendWithQuickItems: vi.fn().mockResolvedValue(undefined),
  };
}
