import { handle } from "hono/vercel";
import { app } from "./main.js";

export default handle(app);
