import type { FC } from "hono/jsx";
import Layout from "./Layout";

const Page: FC = () => {
  return (
    <Layout>
      <h1 className="text-sm">Hello Hono!</h1>
    </Layout>
  );
};

export default Page;
