import type { Reply } from "#api/_usecases/_ports/reply.js";

type Context = Record<string, unknown>;

export function createReplyWithLog(reply: Reply, context: Context): Reply {
  return {
    send: (text) => withLog(context, () => reply.send(text)),
    sendWithQuickItems: (text, items) =>
      withLog(context, () => reply.sendWithQuickItems(text, items)),
  };
}

async function withLog(
  context: Context,
  action: () => Promise<void>,
): Promise<void> {
  try {
    await action();
    console.log("reply sent:", context);
  } catch (error) {
    console.error("reply failed:", context, error);
  }
}
