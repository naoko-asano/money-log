import { vi } from "vitest";
import type { ErrorHandler } from "#api/_usecases/_ports/error-handler.js";

export function createMockedErrorHandler(): ErrorHandler {
  return {
    run: vi.fn().mockResolvedValue(undefined),
  };
}
