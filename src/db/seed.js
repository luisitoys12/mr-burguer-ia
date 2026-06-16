/**
 * Seed inicial para Mr Burguer - Irapuato, Residencial Floresta
 * Ejecutar: node src/db/seed.js
 */
import "dotenv/config";
import { db, schema } from "./index.js";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding Mr Burguer DB...");

  await db.delete(schema.storeHours);
  const hours = [];
  for (let day = 0; day <= 6; day++) {
    hours.push({ dayOfWeek: day, opensAt: "12:00", closesAt: "22:00", isOpen: true });
  }
  await db.insert(schema.storeHours).values(hours);
  console.log("  \u2713 Horarios");

  await db.delete(schema.deliveryZones);
  await db.insert(schema.deliveryZones).values([
    { name: "Residencial Floresta", keywords: ["floresta", "residencial floresta"], cost: "30.00" },
    { name: "Centro Irapuato",       keywords: ["centro", "irapuato centro"],       cost: "40.00" },
    { name: "Fracc. Los Laureles",   keywords: ["laureles", "los laureles"],        cost: "35.00" },
    { name: "Col. Lomas del Bosque", keywords: ["lomas", "bosque", "lomas bosque"], cost: "45.00" },
    { name: "Sin zona / consultar",  keywords: [],                                  cost: "50.00" },
  ]);
  console.log("  \u2713 Zonas de entrega");

  await db.delete(schema.categories);
  const [catBurgers] = await db.insert(schema.categories).values({ name: "Hamburguesas", emoji: "\uD83C\uDF54", sortOrder: 1 }).returning();
  const [catDogs]    = await db.insert(schema.categories).values({ name: "Hot Dogs",     emoji: "\uD83C\uDF2D", sortOrder: 2 }).returning();
  const [catSides]   = await db.insert(schema.categories).values({ name: "Extras",       emoji: "\uD83C\uDF5F", sortOrder: 3 }).returning();
  const [catDrinks]  = await db.insert(schema.categories).values({ name: "Bebidas",      emoji: "\uD83E\uDD64", sortOrder: 4 }).returning();
  console.log("  \u2713 Categor\u00edas");

  await db.delete(schema.products);
  const prods = await db.insert(schema.products).values([
    { categoryId: catBurgers.id, name: "Mr Burguer Cl\u00e1sica",  description: "Carne 150g, queso, lechuga, tomate, cebolla",          price: "75.00",  sortOrder: 1 },
    { categoryId: catBurgers.id, name: "Mr Burguer Doble",    description: "Doble carne 300g, doble queso, vegetales",              price: "105.00", sortOrder: 2 },
    { categoryId: catBurgers.id, name: "Mr Burguer BBQ",      description: "Carne, tocino, queso cheddar, salsa BBQ",               price: "95.00",  sortOrder: 3 },
    { categoryId: catBurgers.id, name: "Mr Burguer Especial", description: "Doble carne, tocino, huevo estrellado, queso fundido",  price: "120.00", sortOrder: 4 },
    { categoryId: catBurgers.id, name: "Mr Burguer Pollo",    description: "Pechuga empanizada, queso, lechuga, aderezo ranch",     price: "85.00",  sortOrder: 5 },
    { categoryId: catDogs.id,    name: "Hot Dog Cl\u00e1sico",     description: "Salchicha, mostaza, catsup, cebolla",                 price: "50.00",  sortOrder: 1 },
    { categoryId: catDogs.id,    name: "Hot Dog Especial",    description: "Salchicha, tocino, queso fundido, jalape\u00f1o",            price: "65.00",  sortOrder: 2 },
    { categoryId: catSides.id,   name: "Papas fritas",        description: "Porci\u00f3n individual crujiente",                          price: "35.00",  sortOrder: 1 },
    { categoryId: catSides.id,   name: "Papas con queso",     description: "Papas fritas ba\u00f1adas en queso fundido",                price: "50.00",  sortOrder: 2 },
    { categoryId: catSides.id,   name: "Aros de cebolla",     description: "6 piezas crujientes",                                  price: "40.00",  sortOrder: 3 },
    { categoryId: catDrinks.id,  name: "Refresco 355ml",      description: "Coca-Cola, Sprite, Fanta o Manzanita",                 price: "25.00",  sortOrder: 1 },
    { categoryId: catDrinks.id,  name: "Agua natural 600ml",  description: "",                                                      price: "15.00",  sortOrder: 2 },
    { categoryId: catDrinks.id,  name: "Malteada",            description: "Vainilla, chocolate o fresa. 500ml",                   price: "55.00",  sortOrder: 3 },
  ]).returning();

  await db.delete(schema.productOptions);
  const burgerIds = prods.filter(p => p.categoryId === catBurgers.id).map(p => p.id);
  const opts = [];
  for (const pid of burgerIds) {
    opts.push(
      { productId: pid, name: "Sin cebolla",   extraCost: "0",     type: "remove" },
      { productId: pid, name: "Sin lechuga",    extraCost: "0",     type: "remove" },
      { productId: pid, name: "Sin tomate",     extraCost: "0",     type: "remove" },
      { productId: pid, name: "Extra queso",    extraCost: "10.00", type: "add"    },
      { productId: pid, name: "Extra toc\u00f3n",   extraCost: "15.00", type: "add"    },
      { productId: pid, name: "Extra jalape\u00f1o", extraCost: "5.00",  type: "add"    },
    );
  }
  await db.insert(schema.productOptions).values(opts);
  console.log("  \u2713 Productos y opciones");

  await db.delete(schema.admins);
  const hash = await bcrypt.hash("MrBurguer2024!", 10);
  await db.insert(schema.admins).values({ username: "admin", passwordHash: hash, role: "admin" });
  console.log("  \u2713 Admin default (user: admin / pass: MrBurguer2024!)");

  console.log("\n\u2705 Seed completado.");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
