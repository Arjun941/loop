import { describe, expect, it } from "vitest";
import { applyPayment, availableInvoiceActions, checkInvoiceAction, daysOverdue, isOverdue } from "./invoice-status";

const open = { status: "confirmed" as const, total: 10_000, amountPaid: 0 };

describe("invoice lifecycle", () => {
  it("drafts can be confirmed or cancelled, not paid or sent", () => {
    expect(availableInvoiceActions({ ...open, status: "draft" })).toEqual(["confirm", "cancel"]);
  });

  it("confirmed invoices can be sent, paid or cancelled", () => {
    expect(availableInvoiceActions(open)).toEqual(["send", "record_payment", "cancel"]);
  });

  it("can't cancel once money has been received", () => {
    expect(checkInvoiceAction("cancel", { ...open, amountPaid: 100 })).toEqual({ ok: false, reason: "It has payments recorded against it" });
  });

  it("paid invoices can only be re-sent", () => {
    expect(availableInvoiceActions({ ...open, status: "paid", amountPaid: 10_000 })).toEqual(["send"]);
  });
});

describe("payments", () => {
  it("records a partial payment and stays confirmed", () => {
    expect(applyPayment(open, 4_000)).toEqual({ ok: true, amountPaid: 4_000, status: "confirmed" });
  });

  it("marks the invoice paid once fully covered", () => {
    expect(applyPayment({ ...open, amountPaid: 4_000 }, 6_000)).toEqual({ ok: true, amountPaid: 10_000, status: "paid" });
  });

  it("refuses overpayment and zero", () => {
    expect(applyPayment(open, 10_001)).toMatchObject({ ok: false });
    expect(applyPayment(open, 0)).toMatchObject({ ok: false });
  });

  it("refuses payments on drafts", () => {
    expect(applyPayment({ ...open, status: "draft" }, 100)).toEqual({ ok: false, reason: "Confirm the invoice first" });
  });
});

describe("overdue", () => {
  it("is overdue only when confirmed, past due and unpaid", () => {
    expect(isOverdue({ ...open, dueDate: "2026-10-30" }, "2026-11-01")).toBe(true);
    expect(isOverdue({ ...open, dueDate: "2026-11-01" }, "2026-11-01")).toBe(false);
    expect(isOverdue({ ...open, status: "paid", amountPaid: 10_000, dueDate: "2026-10-01" }, "2026-11-01")).toBe(false);
  });

  it("counts days overdue", () => {
    expect(daysOverdue("2026-10-25", "2026-11-01")).toBe(7);
  });
});
