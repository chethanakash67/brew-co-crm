import { describe, it, expect } from "vitest";
import { assertSafeSegmentSql, cleanSegmentSql } from "../lib/segmentSql.js";

const VALID_SQL =
  "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE c.tier = 'gold'";

describe("assertSafeSegmentSql", () => {
  it("passes a valid segment query", () => {
    expect(() => assertSafeSegmentSql(VALID_SQL)).not.toThrow();
  });

  it("returns the cleaned SQL for a valid query", () => {
    expect(assertSafeSegmentSql(VALID_SQL)).toBe(VALID_SQL);
  });

  it("rejects queries that don't target the customers table as base", () => {
    const sql = "SELECT DISTINCT o.id FROM orders o";
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects chained queries (SQL injection via semicolon)", () => {
    const sql = `${VALID_SQL}; DROP TABLE orders`;
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects SQL comment injection via --", () => {
    const sql = `${VALID_SQL} -- comment out checks`;
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects SQL block comment /* */ injection", () => {
    const sql = `SELECT DISTINCT c.id FROM customers c /* drop */ WHERE c.tier = 'gold'`;
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects DELETE statement", () => {
    const sql = "DELETE FROM customers WHERE id = '1'";
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects INSERT statement", () => {
    const sql = "INSERT INTO customers (name) VALUES ('Hacker')";
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects DROP statement", () => {
    const sql = "DROP TABLE customers";
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects UPDATE statement", () => {
    const sql = "UPDATE customers SET tier = 'gold'";
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });

  it("rejects nested destructive attempt", () => {
    const sql = `${VALID_SQL} AND c.id NOT IN (DELETE FROM customers)`;
    expect(() => assertSafeSegmentSql(sql)).toThrow();
  });
});

describe("cleanSegmentSql", () => {
  it("trims leading and trailing whitespace", () => {
    const sql = "  SELECT DISTINCT c.id FROM customers c  ";
    expect(cleanSegmentSql(sql).startsWith("SELECT")).toBe(true);
    expect(cleanSegmentSql(sql).endsWith("customers c")).toBe(true);
  });

  it("strips trailing semicolons", () => {
    const sql = `${VALID_SQL};`;
    expect(cleanSegmentSql(sql)).not.toContain(";");
  });
});
