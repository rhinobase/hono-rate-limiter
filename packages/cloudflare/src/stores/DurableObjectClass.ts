import { DurableObject } from "cloudflare:workers";
import type { ClientRateLimitInfo } from "hono-rate-limiter";

const initialState: ClientRateLimitInfo = {
  totalHits: 0,
};

export class DurableObjectRateLimiter extends DurableObject {
  payload: ClientRateLimitInfo;
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.payload = initialState;
  }

  async update(hits: number, windowMs: number) {
    // Updating the payload
    const resetTime = this.payload.resetTime ?? new Date(Date.now() + windowMs);
    this.payload = {
      totalHits: this.payload.totalHits + hits,
      resetTime,
    };

    // Updating the alarm
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm == null) {
      this.ctx.storage.setAlarm(resetTime.getMilliseconds());
    }

    return this.payload;
  }

  reset() {
    this.payload = initialState;
  }

  override async alarm() {
    this.reset();
  }
}
