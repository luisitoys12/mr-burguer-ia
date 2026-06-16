import { pgTable, serial, text, varchar, boolean, integer, numeric, timestamp, json, pgEnum } from "drizzle-orm/pg-core";

export const orderStatusEnum = pgEnum("order_status", [
  "pending", "confirmed", "preparing", "ready", "on_the_way", "delivered", "cancelled"
]);
export const orderTypeEnum = pgEnum("order_type", ["delivery", "pickup"]);
export const channelEnum = pgEnum("channel", ["whatsapp", "web", "phone"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "transfer", "card", "pending"]);

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).unique().notNull(),
  name: varchar("name", { length: 100 }),
  channel: channelEnum("channel").default("whatsapp"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  label: varchar("label", { length: 50 }).default("Casa"),
  street: text("street").notNull(),
  colonia: varchar("colonia", { length: 100 }),
  reference: text("reference"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  emoji: varchar("emoji", { length: 10 }),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => categories.id),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 8, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productOptions = pgTable("product_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  name: varchar("name", { length: 80 }).notNull(),
  extraCost: numeric("extra_cost", { precision: 6, scale: 2 }).default("0"),
  type: varchar("type", { length: 20 }).default("add"),
});

export const deliveryZones = pgTable("delivery_zones", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 80 }).notNull(),
  keywords: json("keywords").$type().default([]),
  cost: numeric("cost", { precision: 6, scale: 2 }).notNull(),
  active: boolean("active").default(true),
});

export const storeHours = pgTable("store_hours", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(),
  opensAt: varchar("opens_at", { length: 5 }).notNull(),
  closesAt: varchar("closes_at", { length: 5 }).notNull(),
  isOpen: boolean("is_open").default(true),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  addressId: integer("address_id").references(() => addresses.id),
  status: orderStatusEnum("status").default("pending"),
  type: orderTypeEnum("type").default("delivery"),
  channel: channelEnum("channel").default("whatsapp"),
  paymentMethod: paymentMethodEnum("payment_method").default("pending"),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  deliveryCost: numeric("delivery_cost", { precision: 8, scale: 2 }).default("0"),
  total: numeric("total", { precision: 10, scale: 2 }),
  notes: text("notes"),
  estimatedTime: integer("estimated_time"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  productId: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 8, scale: 2 }).notNull(),
  options: json("options").default([]),
  notes: text("notes"),
});

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  fromStatus: orderStatusEnum("from_status"),
  toStatus: orderStatusEnum("to_status").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  channel: channelEnum("channel").default("whatsapp"),
  sessionId: varchar("session_id", { length: 64 }),
  messages: json("messages").$type().default([]),
  context: json("context").default({}),
  resolved: boolean("resolved").default(false),
  handedOff: boolean("handed_off").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).default("operator"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
