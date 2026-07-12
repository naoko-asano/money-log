import { vi } from "vitest";
import type { Reply } from "#api/_usecases/_ports/reply.js";

export function createMockedReply(overrides: Partial<Reply> = {}): Reply {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    sendWithQuickItems: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
