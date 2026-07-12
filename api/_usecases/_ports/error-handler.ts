import type { Reply } from "./reply.js";

export type ErrorHandler = {
  run(args: {
    error: unknown;
    label: string;
    reply: Pick<Reply, "send">;
    userText?: string;
  }): Promise<void>;
};
