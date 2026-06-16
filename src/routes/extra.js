import { db, schema } from "../db/index.js";

export async function extraRoutes(fastify) {
  fastify.get("/api/zones", { onRequest: [fastify.authenticate] }, async () =>
    db.query.deliveryZones.findMany({ orderBy: schema.deliveryZones.id })
  );

  fastify.get("/api/hours", { onRequest: [fastify.authenticate] }, async () =>
    db.query.storeHours.findMany({ orderBy: schema.storeHours.dayOfWeek })
  );

  fastify.get("/api/conversations", { onRequest: [fastify.authenticate] }, async (req) => {
    const limit = parseInt(req.query.limit || "50");
    return db.query.aiConversations.findMany({
      limit,
      orderBy: [{ column: schema.aiConversations.updatedAt, order: "desc" }],
      with: { customer: true }
    });
  });
}
