import { handle } from "@hono/node-server/vercel";
import { app } from "../src";

export default handle(app);
