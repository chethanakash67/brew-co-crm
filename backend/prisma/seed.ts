import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env" });
dotenv.config({ path: "backend/.env" });

const prisma = new PrismaClient();

const firstNames = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Ayaan",
  "Krishna",
  "Ishaan",
  "Ananya",
  "Diya",
  "Aadhya",
  "Avni",
  "Kavya",
  "Ira",
  "Saanvi",
  "Meera",
  "Naina",
  "Tara"
];

const lastNames = [
  "Sharma",
  "Verma",
  "Iyer",
  "Nair",
  "Rao",
  "Menon",
  "Reddy",
  "Kapoor",
  "Patel",
  "Das",
  "Chatterjee",
  "Gupta",
  "Kulkarni",
  "Bose",
  "Mishra"
];

const cities = ["Chennai", "Mumbai", "Bangalore", "Delhi", "Hyderabad"];
const menuItems = ["Espresso", "Latte", "Cappuccino", "Cold Brew", "Mocha", "Filter Coffee", "Americano", "Flat White"];
const channels = ["online", "in-store"];

function randomFrom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function buildTier(index: number): string {
  if (index < 100) return "gold";
  if (index < 250) return "silver";
  return "bronze";
}

async function seedDemoData() {
  await prisma.receipt.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  const defaultStore =
    (await prisma.store.findFirst({
      where: { name: { equals: "Brew & Co.", mode: "insensitive" } },
      orderBy: { createdAt: "asc" }
    })) ??
    (await prisma.store.create({
      data: { name: "Brew & Co." }
    }));

  const customers = Array.from({ length: 500 }, (_, index) => {
    const firstName = randomFrom(firstNames);
    const lastName = randomFrom(lastNames);
    const name = `${firstName} ${lastName}`;
    const city = cities[index % cities.length];
    const emailName = `${firstName}.${lastName}.${index + 1}`.toLowerCase();

    return {
      name,
      email: `${emailName}@example.com`,
      phone: `+91${randomBetween(7000000000, 9999999999)}`,
      city,
      tier: buildTier(index),
      createdAt: daysAgo(randomBetween(30, 730)),
      storeId: defaultStore.id
    };
  });

  await prisma.customer.createMany({ data: customers });

  const createdCustomers = await prisma.customer.findMany({ orderBy: { createdAt: "asc" } });
  const inactiveCustomerIds = new Set(createdCustomers.slice(0, 115).map((customer) => customer.id));

  const orders = Array.from({ length: 3000 }, () => {
    const customer = randomFrom(createdCustomers);
    const inactive = inactiveCustomerIds.has(customer.id);
    const orderedAt = inactive ? daysAgo(randomBetween(61, 365)) : daysAgo(randomBetween(0, 365));
    const itemCount = randomBetween(1, 4);
    const items = Array.from({ length: itemCount }, () => ({
      name: randomFrom(menuItems),
      quantity: randomBetween(1, 3)
    }));

    return {
      customerId: customer.id,
      amount: randomBetween(150, 2000),
      items,
      channel: randomFrom(channels),
      orderedAt,
      storeId: defaultStore.id
    };
  });

  await prisma.order.createMany({ data: orders });

  const spendByCustomer = await prisma.order.groupBy({
    by: ["customerId"],
    _sum: { amount: true }
  });

  await prisma.$transaction(
    spendByCustomer.map((row) =>
      prisma.customer.update({
        where: { id: row.customerId },
        data: { totalSpend: row._sum.amount ?? 0 }
      })
    )
  );

  await prisma.segment.createMany({
    data: [
      {
        name: "Gold Chennai Dormant",
        description: "Gold customers in Chennai who have not ordered in 30 days",
        sqlQuery:
          "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE c.tier = 'gold' AND c.city = 'Chennai' AND c.id NOT IN (SELECT customerId FROM orders WHERE orderedAt >= NOW() - INTERVAL '30 days')",
        storeId: defaultStore.id
      },
      {
        name: "High Value Mumbai",
        description: "Mumbai customers with lifetime spend above 5000",
        sqlQuery:
          "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE c.city = 'Mumbai' AND c.totalSpend > 5000",
        storeId: defaultStore.id
      },
      {
        name: "Recent Cold Brew Buyers",
        description: "Customers who ordered Cold Brew in the last 45 days",
        sqlQuery:
          "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE o.orderedAt >= NOW() - INTERVAL '45 days' AND o.items::text ILIKE '%Cold Brew%'",
        storeId: defaultStore.id
      }
    ]
  });

  console.log("Seeded 500 customers, 3000 orders, and 3 starter segments for Brew & Co.");
}

async function main() {
  const seedIfEmpty = process.argv.includes("--if-empty");

  if (seedIfEmpty) {
    const existingCustomers = await prisma.customer.count();
    if (existingCustomers > 0) {
      console.log(`Skipped demo seed because ${existingCustomers} customers already exist.`);
      return;
    }
  }

  await seedDemoData();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
