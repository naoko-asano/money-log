import { vi } from "vitest";
import type { ExpensesRepo } from "#api/_usecases/_ports/expenses-repo.js";

export function createMockedExpensesRepo(
  overrides: Partial<ExpensesRepo> = {},
): ExpensesRepo {
  return {
    exists: vi.fn().mockResolvedValue(false),
    createFromPending: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
