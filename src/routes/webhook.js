/**
 * Webhook de WhatsApp Business Cloud API
 * POST /webhook/whatsapp  — mensajes entrantes
 * GET  /webhook/whatsapp  — verificación Meta
 */
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { processMessage } from "../ai/engine.js";

export async function webhookRoutes(fastify) {
  fastify.get("/webhook/whatsapp", async (req, reply) => {
    const mode      = req.query["hub.mode"];
    const token     = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) return reply.send(challenge);
    return reply.status(403).send("Forbidden");
  });

  fastify.post("/webhook/whatsapp", async (req, reply) => {
    const body = req.body;
    if (!body?.object || body.object !== "whatsapp_business_account") return reply.status(400).send("Bad request");
    try {
      const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
      if (!msg) return reply.status(200).send("OK");

      const phone = msg.from;
      const text  = msg.type === "text" ? msg.text?.body : msg.type;

      let customer = await db.query.customers.findFirst({ where: eq(schema.customers.phone, phone) });
      if (!customer) {
        [customer] = await db.insert(schema.customers).values({ phone, channel: "whatsapp" }).returning();
      }

      let convo = await db.query.aiConversations.findFirst({
        where: eq(schema.aiConversations.customerId, customer.id),
        orderBy: [{ column: schema.aiConversations.createdAt, order: "desc" }]
      });

      const context = convo?.context || {};
      const { text: responseText, context: newContext } = await processMessage({ customerId: customer.id, message: text, context, channel: "whatsapp" });

      if (convo && !convo.resolved) {
        await db.update(schema.aiConversations)
          .set({ context: newContext, messages: [...(convo.messages || []), { role: "user", text }, { role: "bot", text: responseText }], updatedAt: new Date() })
          .where(eq(schema.aiConversations.id, convo.id));
      } else {
        await db.insert(schema.aiConversations).values({
          customerId: customer.id, channel: "whatsapp", context: newContext,
          messages: [{ role: "user", text }, { role: "bot", text: responseText }],
          resolved: newContext.step === "done",
        });
      }

      await sendWhatsAppMessage(phone, responseText);
      return reply.status(200).send("OK");
    } catch (err) {
      fastify.log.error(err);
      return reply.status(200).send("OK");
    }
  });
}

async function sendWhatsAppMessage(to, text) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) return;
  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
}
