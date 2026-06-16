import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function adminRoutes(fastify) {
  fastify.get("/admin", async (req, reply) => {
    const html = readFileSync(join(__dirname, "../../public/admin.html"), "utf-8");
    return reply.type("text/html").send(html);
  });

  fastify.get("/api/stats", { onRequest: [fastify.authenticate] }, async () => {
    const { db, schema } = await import("../db/index.js");
    const { count, sum } = await import("drizzle-orm");
    const [ordersCount]   = await db.select({ value: count() }).from(schema.orders);
    const [pendingCount]  = await db.select({ value: count() }).from(schema.orders).where(schema.orders.status.eq("pending"));
    const [revenue]       = await db.select({ value: sum(schema.orders.total) }).from(schema.orders).where(schema.orders.status.eq("delivered"));
    const [customersCount]= await db.select({ value: count() }).from(schema.customers);
    return {
      orders:    ordersCount.value,
      pending:   pendingCount.value,
      revenue:   parseFloat(revenue.value || 0).toFixed(2),
      customers: customersCount.value,
    };
  });
}
