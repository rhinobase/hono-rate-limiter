import { handle } from "@hono/node-server/vercel";
import { app } from "./main";

export default handle(app);
