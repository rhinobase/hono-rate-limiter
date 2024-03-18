/**
 * The rate limit related information for each client included in the
 * Hono context object.
 */
export type RateLimitInfo = {
  limit: number;
  used: number;
  remaining: number;
  resetTime: Date | undefined;
};
