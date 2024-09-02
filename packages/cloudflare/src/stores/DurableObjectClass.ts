import { DurableObject } from "cloudflare:workers";
import type { ClientRateLimitInfo } from "hono-rate-limiter";

const initialState: ClientRateLimitInfo = {
  totalHits: 0,
};

export class DurableObjectRateLimiter extends DurableObject {
  async update(hits: number, windowMs: number) {
    let payload =
      (await this.ctx.storage.get<ClientRateLimitInfo>("value")) ||
      initialState;

    // Updating the payload
    const resetTime = new Date(payload.resetTime ?? Date.now() + windowMs);

    payload = {
      totalHits: payload.totalHits + hits,
      resetTime,
    };

    // Updating the alarm
    const currentAlarm = await this.ctx.storage.getAlarm();
    if (currentAlarm == null) {
      this.ctx.storage.setAlarm(resetTime.getTime());
    }

    await this.ctx.storage.put("value", payload);

    return payload;
  }

  async reset() {
    await this.ctx.storage.put("value", initialState);
  }

  override async alarm() {
    await this.reset();
  }
}
