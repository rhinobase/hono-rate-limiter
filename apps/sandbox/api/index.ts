import { handle } from "hono/vercel";
import { app } from "./main";

export default handle(app);
