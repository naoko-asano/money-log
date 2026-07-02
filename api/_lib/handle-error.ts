export const DEFAULT_USER_ERROR_TEXT =
  "エラーが発生しました。しばらく経ってからお試しください。";

export async function handleError({
  error,
  label,
  notify,
}: {
  error: unknown;
  label: string;
  notify: () => Promise<void>;
}): Promise<void> {
  console.error(`${label} failed:`, error);
  await notify();
}
