import { cloudflare } from "../cloudflare";

describe("cloudflare", () => {
  it("should work", () => {
    expect(cloudflare()).toEqual("cloudflare");
  });
});
