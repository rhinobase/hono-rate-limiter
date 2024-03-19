import type { RateLimitInfo } from "hono-rate-limiter";
import type { FC } from "hono/jsx";
import Layout from "./Layout";

const Page: FC<{ info: RateLimitInfo }> = (props: { info: RateLimitInfo }) => {
  return (
    <Layout>
      <h1 className="text-sm">Hello Hono!</h1>
    </Layout>
  );
};

export default Page;
