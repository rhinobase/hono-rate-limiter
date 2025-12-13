import type { Context } from "hono";
import type { RateLimitInfo } from "./types";

/**
 * Returns the number of seconds left for the window to reset. Uses `windowMs`
 * in case the store doesn't return a `resetTime`.
 *
 * @param resetTime {Date | undefined} - The timestamp at which the store window resets.
 * @param windowMs {number | undefined} - The window length.
 */
const getResetSeconds = (
  resetTime?: Date,
  windowMs?: number,
): number | undefined => {
  let resetSeconds: number | undefined;
  if (resetTime) {
    const deltaSeconds = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
    resetSeconds = Math.max(0, deltaSeconds);
  } else if (windowMs) {
    // This isn't really correct, but the field is required by the spec in `draft-7`,
    // so this is the best we can do. The validator should have already logged a
    // warning by this point.
    resetSeconds = Math.ceil(windowMs / 1000);
  }

  return resetSeconds;
};

/**
 * Sets `RateLimit-*`` headers based on the sixth draft of the IETF specification.
 * See https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-06.
 *
 * @param context {Context} - The hono context object to set headers on.
 * @param info {RateLimitInfo} - The rate limit info, used to set the headers.
 * @param windowMs {number} - The window length.
 */
export const setDraft6Headers = (
  context: Context,
  info: RateLimitInfo,
  windowMs: number,
): void => {
  if (context.finalized) return;

  const windowSeconds = Math.ceil(windowMs / 1000);
  const resetSeconds = getResetSeconds(info.resetTime);

  context.header("RateLimit-Policy", `${info.limit};w=${windowSeconds}`);
  context.header("RateLimit-Limit", info.limit.toString());
  context.header("RateLimit-Remaining", info.remaining.toString());

  // Set this header only if the store returns a `resetTime`.
  if (resetSeconds) context.header("RateLimit-Reset", resetSeconds.toString());
};

/**
 * Sets `RateLimit` & `RateLimit-Policy` headers based on the seventh draft of the spec.
 * See https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers-07.
 *
 * @param context {Context} - The hono context object to set headers on.
 * @param info {RateLimitInfo} - The rate limit info, used to set the headers.
 * @param windowMs {number} - The window length.
 */
export const setDraft7Headers = (
  context: Context,
  info: RateLimitInfo,
  windowMs: number,
): void => {
  if (context.finalized) return;

  const windowSeconds = Math.ceil(windowMs / 1000);
  const resetSeconds = getResetSeconds(info.resetTime, windowMs);

  context.header("RateLimit-Policy", `${info.limit};w=${windowSeconds}`);
  context.header(
    "RateLimit",
    `limit=${info.limit}, remaining=${info.remaining}, reset=${resetSeconds}`,
  );
};

/**
 * Sets the `Retry-After` header.
 *
 * @param context {Context} - The hono context object to set headers on.
 * @param info {RateLimitInfo} - The rate limit info, used to set the headers.
 * @param windowMs {number} - The window length.
 */
export const setRetryAfterHeader = (
  context: Context,
  info: RateLimitInfo,
  windowMs: number,
): void => {
  if (context.finalized) return;

  const resetSeconds = getResetSeconds(info.resetTime, windowMs);
  context.header("Retry-After", resetSeconds?.toString());
};
