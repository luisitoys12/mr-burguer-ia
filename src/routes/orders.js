import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";

export async function orderRoutes(fastify) {
  fastify.get("/api/orders", { onRequest: [fastify.authenticate] }, async (req) => {
    const limit  = parseInt(req.query.limit  || "50");
    const status = req.query.status;
    return db.query.orders.findMany({
      limit,
      where: status ? eq(schema.orders.status, status) : undefined,
      orderBy: [desc(schema.orders.createdAt)],
      with: { customer: true, items: { with: { product: true } } }
    });
  });

  fastify.get("/api/orders/:id", { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const order = await db.query.orders.findFirst({
      where: eq(schema.orders.id, parseInt(req.params.id)),
      with: { customer: true, address: true, items: { with: { product: true } }, events: true }
    });
    if (!order) return reply.status(404).send({ error: "Pedido no encontrado" });
    return order;
  });

  fastify.patch("/api/orders/:id/status", { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const { status, note } = req.body;
    const id = parseInt(req.params.id);
    const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id) });
    if (!order) return reply.status(404).send({ error: "Pedido no encontrado" });
    await db.update(schema.orders).set({ status, updatedAt: new Date() }).where(eq(schema.orders.id, id));
    await db.insert(schema.orderEvents).values({ orderId: id, fromStatus: order.status, toStatus: status, note });
    return { ok: true };
  });
}
