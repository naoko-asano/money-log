import type { ErrorHandler } from "#api/_usecases/_ports/error-handler.js";

export const DEFAULT_USER_ERROR_TEXT =
  "エラーが発生しました。しばらく経ってからお試しください。";

export function createErrorHandler(context: {
  userId: string;
  webhookEventId: string;
  type: string;
}): ErrorHandler {
  return {
    async run({ error, label, reply, userText = DEFAULT_USER_ERROR_TEXT }) {
      console.error(`${label} failed:`, context, error);
      await reply.send(userText);
    },
  };
}
