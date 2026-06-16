import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function authRoutes(fastify) {
  fastify.post("/api/auth/login", async (req, reply) => {
    const { username, password } = req.body || {};
    if (!username || !password) return reply.status(400).send({ error: "Credenciales requeridas" });
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.username, username) });
    if (!admin || !admin.active) return reply.status(401).send({ error: "Credenciales inv\u00e1lidas" });
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return reply.status(401).send({ error: "Credenciales inv\u00e1lidas" });
    const token = fastify.jwt.sign({ id: admin.id, username: admin.username, role: admin.role }, { expiresIn: "8h" });
    return { token, role: admin.role };
  });

  fastify.get("/api/auth/me", { onRequest: [fastify.authenticate] }, async (req) => req.user);
}
