import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { processMessage } from "../ai/engine.js";

export async function webChatRoutes(fastify) {
  fastify.post("/api/chat", async (req, reply) => {
    const { phone, message, sessionId } = req.body || {};
    if (!phone || !message) return reply.status(400).send({ error: "phone y message son requeridos" });

    let customer = await db.query.customers.findFirst({ where: eq(schema.customers.phone, phone) });
    if (!customer) {
      [customer] = await db.insert(schema.customers).values({ phone, channel: "web" }).returning();
    }

    let convo = null;
    if (sessionId) {
      convo = await db.query.aiConversations.findFirst({ where: eq(schema.aiConversations.sessionId, sessionId) });
    }

    const context = convo?.context || {};
    const { text: responseText, context: newContext } = await processMessage({ customerId: customer.id, message, context, channel: "web" });

    if (convo) {
      await db.update(schema.aiConversations).set({
        context: newContext,
        messages: [...(convo.messages || []), { role: "user", text: message }, { role: "bot", text: responseText }],
        updatedAt: new Date(),
      }).where(eq(schema.aiConversations.id, convo.id));
    } else {
      const newSessionId = sessionId || `web_${Date.now()}`;
      [convo] = await db.insert(schema.aiConversations).values({
        customerId: customer.id, channel: "web", sessionId: newSessionId,
        context: newContext,
        messages: [{ role: "user", text: message }, { role: "bot", text: responseText }],
      }).returning();
    }

    return { reply: responseText, sessionId: convo.sessionId || convo.id };
  });
}
