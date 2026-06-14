import { assertSafeSegmentSql } from "./lib/segmentSql.js";

type TestCase = {
  name: string;
  sql: string;
  shouldPass: boolean;
};

const testCases: TestCase[] = [
  {
    name: "Valid segment query",
    sql: "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE c.tier = 'gold'",
    shouldPass: true,
  },
  {
    name: "Query targeting non-customer base table",
    sql: "SELECT DISTINCT o.id FROM orders o",
    shouldPass: false,
  },
  {
    name: "Chained queries (SQL injection attempt)",
    sql: "SELECT DISTINCT c.id, c.name FROM customers c; DROP TABLE orders",
    shouldPass: false,
  },
  {
    name: "SQL Comment injection (--) attempt",
    sql: "SELECT DISTINCT c.id FROM customers c -- comment out checks",
    shouldPass: false,
  },
  {
    name: "SQL Block comment (/* */) attempt",
    sql: "SELECT DISTINCT c.id FROM customers c /* comment */ WHERE c.tier = 'gold'",
    shouldPass: false,
  },
  {
    name: "Destructive token (DELETE) attempt",
    sql: "SELECT DISTINCT c.id FROM customers c WHERE c.id IN (SELECT customerId FROM orders WHERE amount > 1000) AND c.id NOT IN (DELETE FROM customers)",
    shouldPass: false,
  },
  {
    name: "Data manipulation (INSERT) attempt",
    sql: "INSERT INTO customers (name, email) VALUES ('Hacker', 'hacker@example.com')",
    shouldPass: false,
  },
];

console.log("----------------------------------------");
console.log("Running SQL Safety Filter Unit Tests...");
console.log("----------------------------------------");

let failedCount = 0;

for (const tc of testCases) {
  try {
    assertSafeSegmentSql(tc.sql);
    if (!tc.shouldPass) {
      console.error(`❌ FAIL: "${tc.name}" passed but was expected to throw.`);
      failedCount++;
    } else {
      console.log(`✅ PASS: "${tc.name}"`);
    }
  } catch (error) {
    if (tc.shouldPass) {
      console.error(`❌ FAIL: "${tc.name}" threw an error but was expected to pass. Error:`, (error as Error).message);
      failedCount++;
    } else {
      console.log(`✅ PASS: "${tc.name}" correctly rejected: ${(error as Error).message}`);
    }
  }
}

console.log("----------------------------------------");
if (failedCount === 0) {
  console.log("🎉 All unit tests passed successfully!");
  process.exit(0);
} else {
  console.error(`🚨 ${failedCount} test case(s) failed.`);
  process.exit(1);
}
