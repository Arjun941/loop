import { describe, expect, it } from "vitest";
import { findInvoiceNumbers, matchStatement, parseAmount, parseDate, parseStatement, type OpenInvoice } from "./matching";

const open: OpenInvoice[] = [
  { id: "a", number: "INV-2026-000101", customerName: "Sunrise Bakery", balance: 707_056 },
  { id: "b", number: "INV-2026-000102", customerName: "Kerluke LLC", balance: 1_037_692 },
  { id: "c", number: "INV-2026-000103", customerName: "Pagac Group", balance: 636_492 },
  { id: "d", number: "INV-2026-000104", customerName: "Hamill Gusikowski", balance: 50_000 },
  { id: "e", number: "INV-2026-000105", customerName: "Sporer and Sons", balance: 50_000 },
];

describe("parsing", () => {
  it("reads amounts in Indian formats", () => {
    expect(parseAmount("7,070.56")).toBe(707_056);
    expect(parseAmount("₹ 1,23,456")).toBe(12_345_600);
    expect(parseAmount("")).toBeNull();
  });

  it("reads common date formats", () => {
    expect(parseDate("2026-10-31")).toBe("2026-10-31");
    expect(parseDate("31/10/2026")).toBe("2026-10-31");
    expect(parseDate("5-11-2026")).toBe("2026-11-05");
  });

  it("finds headers, skips debits, and handles quoted commas", () => {
    const csv = 'Txn Date,Narration,Credit\n2026-10-31,"NEFT, Sunrise Bakery INV-2026-000101","7,070.56"\n2026-10-31,Bank charges,-50\n';
    expect(parseStatement(csv)).toEqual({ lines: [{ date: "2026-10-31", amount: 707_056, reference: "NEFT, Sunrise Bakery INV-2026-000101" }] });
  });

  it("explains a file with the wrong columns", () => {
    expect(parseStatement("foo,bar\n1,2").error).toMatch(/date, amount and description/);
  });

  it("finds invoice numbers without dashes", () => {
    expect(findInvoiceNumbers("upi/inv 2026 000102/kerluke")).toEqual(["INV-2026-000102"]);
  });
});

describe("matching", () => {
  it("auto-matches by invoice number and exact amount", () => {
    const [m] = matchStatement([{ date: "2026-10-31", amount: 707_056, reference: "NEFT INV-2026-000101" }], open);
    expect(m).toMatchObject({ invoiceId: "a", status: "auto", confidence: 0.99 });
  });

  it("sends a partial payment to review", () => {
    const [m] = matchStatement([{ date: "2026-10-31", amount: 300_000, reference: "INV-2026-000101 part" }], open);
    expect(m).toMatchObject({ invoiceId: "a", status: "review", confidence: 0.8 });
  });

  it("auto-matches by customer name and exact amount", () => {
    const [m] = matchStatement([{ date: "2026-10-31", amount: 636_492, reference: "IMPS PAGAC GROUP PAYMENT" }], open);
    expect(m).toMatchObject({ invoiceId: "c", status: "auto", confidence: 0.9 });
  });

  it("only suggests when the amount alone matches several invoices", () => {
    const [m] = matchStatement([{ date: "2026-10-31", amount: 50_000, reference: "CASH DEPOSIT" }], open);
    expect(m).toMatchObject({ invoiceId: null, status: "review" });
  });

  it("never matches two lines to the same invoice", () => {
    const ms = matchStatement(
      [
        { date: "2026-10-31", amount: 1_037_692, reference: "KERLUKE" },
        { date: "2026-10-31", amount: 1_037_692, reference: "INV-2026-000102" },
      ],
      open,
    );
    expect(ms[1]).toMatchObject({ invoiceId: "b", status: "auto" });
    expect(ms[0].invoiceId).toBeNull();
  });
});
