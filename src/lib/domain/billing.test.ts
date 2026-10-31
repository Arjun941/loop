import { describe, expect, it } from "vitest";
import { duePeriods, invoiceNumber, MAX_CATCH_UP_PERIODS } from "./billing";

describe("duePeriods", () => {
  it("bills one monthly period that's due today", () => {
    expect(duePeriods({ nextInvoiceDate: "2026-11-01", expiryDate: null, period: "monthly" }, "2026-11-01")).toEqual({
      periods: [{ start: "2026-11-01", end: "2026-11-30" }],
      nextInvoiceDate: "2026-12-01",
      reachesExpiry: false,
    });
  });

  it("bills nothing before the date", () => {
    expect(duePeriods({ nextInvoiceDate: "2026-11-02", expiryDate: null, period: "monthly" }, "2026-11-01").periods).toEqual([]);
  });

  it("catches up on missed periods", () => {
    const r = duePeriods({ nextInvoiceDate: "2026-08-15", expiryDate: null, period: "monthly" }, "2026-11-01");
    expect(r.periods.map((p) => p.start)).toEqual(["2026-08-15", "2026-09-15", "2026-10-15"]);
    expect(r.nextInvoiceDate).toBe("2026-11-15");
  });

  it("stops at expiry and ends the last period the day before", () => {
    const r = duePeriods({ nextInvoiceDate: "2026-10-01", expiryDate: "2026-10-20", period: "monthly" }, "2026-11-01");
    expect(r).toEqual({ periods: [{ start: "2026-10-01", end: "2026-10-19" }], nextInvoiceDate: null, reachesExpiry: true });
  });

  it("handles month ends (Jan 31 → Feb 28)", () => {
    const r = duePeriods({ nextInvoiceDate: "2027-01-31", expiryDate: null, period: "monthly" }, "2027-01-31");
    expect(r.periods[0]).toEqual({ start: "2027-01-31", end: "2027-02-27" });
    expect(r.nextInvoiceDate).toBe("2027-02-28");
  });

  it("caps catch-up", () => {
    const r = duePeriods({ nextInvoiceDate: "2020-01-01", expiryDate: null, period: "weekly" }, "2026-11-01");
    expect(r.periods).toHaveLength(MAX_CATCH_UP_PERIODS);
  });

  it("does nothing for subscriptions with no next date", () => {
    expect(duePeriods({ nextInvoiceDate: null, expiryDate: null, period: "monthly" }, "2026-11-01").periods).toEqual([]);
  });
});

describe("invoiceNumber", () => {
  it("pads the sequence", () => {
    expect(invoiceNumber("2026", 42)).toBe("INV-2026-000042");
  });
});
