import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

export async function menuRoutes(fastify) {
  fastify.get("/api/menu", async () => {
    return db.query.categories.findMany({
      where: eq(schema.categories.active, true),
      orderBy: schema.categories.sortOrder,
      with: {
        products: {
          where: eq(schema.products.available, true),
          orderBy: schema.products.sortOrder,
          with: { options: true }
        }
      }
    });
  });

  fastify.post("/api/menu/products", { onRequest: [fastify.authenticate] }, async (req) => {
    const [p] = await db.insert(schema.products).values(req.body).returning();
    return p;
  });

  fastify.patch("/api/menu/products/:id", { onRequest: [fastify.authenticate] }, async (req) => {
    const [p] = await db.update(schema.products).set(req.body).where(eq(schema.products.id, parseInt(req.params.id))).returning();
    return p;
  });
}
