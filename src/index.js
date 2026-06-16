import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import jwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import staticFiles from "@fastify/static";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { webhookRoutes } from "./routes/webhook.js";
import { orderRoutes }   from "./routes/orders.js";
import { menuRoutes }    from "./routes/menu.js";
import { authRoutes }    from "./routes/auth.js";
import { webChatRoutes } from "./routes/web.js";
import { adminRoutes }   from "./routes/admin.js";
import { extraRoutes }   from "./routes/extra.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" } });

await fastify.register(cors, { origin: true });
await fastify.register(formbody);
await fastify.register(cookie);
await fastify.register(jwt, { secret: process.env.JWT_SECRET || "mr-burguer-secret-dev-change-this" });
await fastify.register(staticFiles, { root: join(__dirname, "../public"), prefix: "/static/" });

fastify.decorate("authenticate", async function (request, reply) {
  try { await request.jwtVerify(); }
  catch { reply.status(401).send({ error: "No autorizado" }); }
});

await fastify.register(webhookRoutes);
await fastify.register(authRoutes);
await fastify.register(orderRoutes);
await fastify.register(menuRoutes);
await fastify.register(webChatRoutes);
await fastify.register(adminRoutes);
await fastify.register(extraRoutes);

fastify.get("/health", async () => ({
  status: "ok", service: "mr-burguer-api", version: "1.0.0", time: new Date().toISOString()
}));

const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "0.0.0.0";

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`\n\uD83C\uDF54 Mr Burguer API \u2192 http://${HOST}:${PORT}`);
  console.log(`\uD83D\uDCCB Panel admin   \u2192 http://${HOST}:${PORT}/admin\n`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
