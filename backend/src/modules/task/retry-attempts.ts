export const DEFAULT_RETRY_ATTEMPTS = 3;
export const MIN_RETRY_ATTEMPTS = 1;
export const MAX_RETRY_ATTEMPTS = 10;

export function normalizeRetryAttempts(value?: number | string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_RETRY_ATTEMPTS;
  }

  return Math.min(
    Math.max(Math.floor(parsed), MIN_RETRY_ATTEMPTS),
    MAX_RETRY_ATTEMPTS,
  );
}
