/**
 * Motor IA de pedidos - Mr Burguer
 * Maneja el flujo de conversación y arma pedidos desde lenguaje natural.
 */
import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";

const STEPS = {
  GREETING: "greeting",
  MENU:     "menu",
  ORDER:    "order",
  ADDRESS:  "address",
  CONFIRM:  "confirm",
  PAYMENT:  "payment",
  DONE:     "done",
  HANDOFF:  "handoff",
};

export async function processMessage({ customerId, message, context = {}, channel = "whatsapp" }) {
  const step = context.step || STEPS.GREETING;
  const text = message.trim().toLowerCase();

  if (/humano|persona|operador|encargado|gerente|hablar con alguien/.test(text)) {
    return handoff(context);
  }

  switch (step) {
    case STEPS.GREETING: return handleGreeting(text, context);
    case STEPS.MENU:     return handleMenu(text, context);
    case STEPS.ORDER:    return handleOrder(text, context);
    case STEPS.ADDRESS:  return handleAddress(text, context, customerId);
    case STEPS.CONFIRM:  return handleConfirm(text, context);
    case STEPS.PAYMENT:  return handlePayment(text, context, customerId);
    default:             return handleGreeting(text, context);
  }
}

async function handleGreeting(text, ctx) {
  const open = await isStoreOpen();
  if (!open) {
    return reply("\u23f0 Por el momento *Mr Burguer* est\u00e1 cerrado.\n\nNuestro horario es *12:00 \u2013 22:00*, todos los d\u00edas.\n\n\u00a1Te esperamos pronto! \uD83C\uDF54", { ...ctx, step: STEPS.GREETING });
  }
  const menu = await getMenuText();
  return reply(
    `\u00a1Hola! \uD83D\uDC4B Bienvenid@ a *Mr Burguer* - Residencial Floresta, Irapuato.\n\n${menu}\n\n\u00bfQu\u00e9 te gustar\u00eda pedir hoy? Puedes escribirme por ejemplo:\n_"Quiero 2 Mr Burguer Cl\u00e1sica y una Coca"_`,
    { ...ctx, step: STEPS.ORDER, cart: [] }
  );
}

async function handleMenu(text, ctx) {
  const menu = await getMenuText();
  return reply(`${menu}\n\n\u00bfQu\u00e9 te gustar\u00eda pedir? \uD83D\uDE0A`, { ...ctx, step: STEPS.ORDER });
}

async function handleOrder(text, ctx) {
  const products = await db.query.products.findMany({ where: eq(schema.products.available, true) });
  const items = parseCartFromText(text, products);

  if (items.length === 0) {
    return reply(
      `No entend\u00ed bien tu pedido \uD83D\uDE05\n\nPuedes escribir algo como:\n_"2 hamburguesas dobles, unas papas y una malteada de chocolate"_\n\nO escribe *men\u00fa* para ver las opciones.`,
      ctx
    );
  }

  const cart = [...(ctx.cart || []), ...items];
  const cartText = formatCart(cart);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return reply(
    `\u00a1Perfecto! \uD83C\uDF89 Tu pedido hasta ahora:\n\n${cartText}\n\uD83D\uDCB0 *Subtotal: $${subtotal.toFixed(2)}*\n\n\u00bfEs para *env\u00edo a domicilio* o *recoger en el local*?`,
    { ...ctx, step: STEPS.ADDRESS, cart, subtotal }
  );
}

async function handleAddress(text, ctx, customerId) {
  const isPickup = /recoger|local|llevar|yo voy|voy por \u00e9l|pickup/.test(text);
  if (isPickup) {
    return reply(
      `Perfecto, pedido para *recoger en el local* \uD83C\uDFE0\n\nNos ubicamos en *Residencial Floresta, Irapuato*.\n\n\u00bfC\u00f3mo vas a pagar?\n1\uFE0F\u20E3 Efectivo\n2\uFE0F\u20E3 Transferencia (SPEI/CoDi)\n3\uFE0F\u20E3 Tarjeta en el local`,
      { ...ctx, step: STEPS.PAYMENT, orderType: "pickup", deliveryCost: 0 }
    );
  }

  const zone = await detectZone(text);
  if (!zone) {
    return reply(
      `Por favor dime tu direcci\u00f3n completa: *calle, n\u00famero y colonia* en Irapuato.\n\n_Ej: Av. Floresta 123, Residencial Floresta_`,
      ctx
    );
  }

  const total = (parseFloat(ctx.subtotal) + parseFloat(zone.cost)).toFixed(2);
  return reply(
    `\uD83D\uDCCD Direcci\u00f3n registrada en *${zone.name}*.\n\uD83D\uDE9A Costo de env\u00edo: $${zone.cost}\n\uD83D\uDCB0 *Total: $${total}*\n\n\u00bfC\u00f3mo vas a pagar?\n1\uFE0F\u20E3 Efectivo\n2\uFE0F\u20E3 Transferencia (SPEI/CoDi)`,
    { ...ctx, step: STEPS.PAYMENT, orderType: "delivery", deliveryCost: zone.cost, deliveryAddress: text, deliveryZoneId: zone.id, total }
  );
}

async function handleConfirm(text, ctx) {
  if (/s[i\u00ed]|confirmar|est\u00e1 bien|ok|dale|claro|va/.test(text)) return handlePayment("confirmar", ctx, null);
  if (/no|cancelar|cambiar/.test(text)) return reply("Sin problema \uD83D\uDE0A Dime qu\u00e9 quieres cambiar o escribe *men\u00fa* para empezar de nuevo.", { ...ctx, step: STEPS.ORDER, cart: [] });
  return reply("\u00bfConfirmas tu pedido? Responde *s\u00ed* o *no*.", ctx);
}

async function handlePayment(text, ctx, customerId) {
  let method = "pending";
  if (/efectivo|cash/.test(text))      method = "cash";
  if (/transfer|spei|codi/.test(text)) method = "transfer";
  if (/tarjeta|card/.test(text))       method = "card";

  if (method === "pending") {
    return reply("\u00bfC\u00f3mo vas a pagar?\n1\uFE0F\u20E3 *Efectivo*\n2\uFE0F\u20E3 *Transferencia* (SPEI/CoDi)\n3\uFE0F\u20E3 *Tarjeta*", ctx);
  }

  const cartText = formatCart(ctx.cart);
  const total = ctx.total || ctx.subtotal;
  const typeText = ctx.orderType === "pickup"
    ? "Recoger en local \uD83C\uDFE0"
    : `Env\u00edo a domicilio \uD83D\uDE9A\n\uD83D\uDCCD ${ctx.deliveryAddress}`;

  const payMsg = method === "transfer"
    ? "\n\n\uD83D\uDCB3 *Datos de transferencia:*\nBanco: BBVA\nCuenta: 1234 5678 9012 3456\nCLABE: 012 345 678 901 234 567\nBeneficiario: Mr Burguer"
    : "";

  return reply(
    `\u2705 *\u00a1Pedido confirmado!*\n\n${cartText}\n\n\uD83D\uDCE6 *${typeText}*\n\uD83D\uDCB0 *Total: $${parseFloat(total).toFixed(2)}*\n\uD83D\uDCB3 Pago: ${translatePayment(method)}${payMsg}\n\n\u23F1\uFE0F Tiempo estimado: *30-45 min*\n\n\u00a1Gracias por elegir Mr Burguer! \uD83C\uDF54\u2764\uFE0F`,
    { ...ctx, step: STEPS.DONE, paymentMethod: method }
  );
}

function handoff(ctx) {
  return reply(
    "Entendido, te conecto con un operador en un momento \uD83D\uDE4B\n\nMientras esperas, describe tu duda o pedido especial.",
    { ...ctx, step: STEPS.HANDOFF, handedOff: true }
  );
}

function reply(text, context) { return { text, context }; }
function translatePayment(m) {
  return { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", pending: "Por definir" }[m] || m;
}

function parseCartFromText(text, products) {
  const items = [];
  for (const product of products) {
    const name = product.name.toLowerCase();
    const regex = new RegExp(`(\\d+)?\\s*${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}`, "i");
    if (regex.test(text) || text.includes(name.split(" ")[1] || name)) {
      const match = text.match(new RegExp(`(\\d+)\\s*${name}`, "i"));
      const qty = match ? parseInt(match[1]) : 1;
      items.push({ productId: product.id, name: product.name, qty, price: parseFloat(product.price), options: [] });
    }
  }
  return items;
}

function formatCart(cart) {
  return cart.map(i => `\u2022 ${i.qty}x ${i.name} \u2014 $${(i.price * i.qty).toFixed(2)}`).join("\n");
}

async function getMenuText() {
  const cats = await db.query.categories.findMany({
    where: eq(schema.categories.active, true),
    orderBy: schema.categories.sortOrder,
    with: { products: { where: eq(schema.products.available, true), orderBy: schema.products.sortOrder } }
  });
  let text = "\uD83C\uDF54 *Men\u00fa Mr Burguer*\n";
  for (const cat of cats) {
    if (!cat.products?.length) continue;
    text += `\n${cat.emoji || ""} *${cat.name}*\n`;
    for (const p of cat.products) text += `  ${p.name} \u2014 $${parseFloat(p.price).toFixed(2)}\n`;
  }
  return text.trim();
}

async function isStoreOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;
  const schedule = await db.query.storeHours.findFirst({
    where: and(eq(schema.storeHours.dayOfWeek, day), eq(schema.storeHours.isOpen, true))
  });
  if (!schedule) return false;
  const [oh, om] = schedule.opensAt.split(":").map(Number);
  const [ch, cm] = schedule.closesAt.split(":").map(Number);
  return hour >= (oh + om / 60) && hour < (ch + cm / 60);
}

async function detectZone(text) {
  const zones = await db.query.deliveryZones.findMany({ where: eq(schema.deliveryZones.active, true) });
  const lower = text.toLowerCase();
  for (const zone of zones) {
    const keywords = Array.isArray(zone.keywords) ? zone.keywords : [];
    if (keywords.some(k => lower.includes(k))) return zone;
  }
  return zones.find(z => z.name === "Sin zona / consultar") || null;
}
