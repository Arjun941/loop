import { describe, expect, it } from "vitest";
import { availableActions, checkAction, type PlanRules } from "./subscription-status";

const flexible: PlanRules = { pausable: true, closable: true, renewable: true };
const strict: PlanRules = { pausable: false, closable: false, renewable: false };
const today = "2026-11-01";

describe("subscription lifecycle", () => {
  it("follows draft → quotation → confirmed → active", () => {
    expect(checkAction("send_quote", { status: "draft", plan: flexible, expiryDate: null, today })).toEqual({ ok: true, to: "quotation" });
    expect(checkAction("confirm", { status: "quotation", plan: flexible, expiryDate: null, today })).toEqual({ ok: true, to: "confirmed" });
    expect(checkAction("activate", { status: "confirmed", plan: flexible, expiryDate: null, today })).toEqual({ ok: true, to: "active" });
  });

  it("refuses to skip steps", () => {
    expect(checkAction("activate", { status: "draft", plan: flexible, expiryDate: null, today }).ok).toBe(false);
    expect(checkAction("confirm", { status: "draft", plan: flexible, expiryDate: null, today }).ok).toBe(false);
  });

  it("only pauses plans that allow it", () => {
    expect(checkAction("pause", { status: "active", plan: flexible, expiryDate: null, today }).ok).toBe(true);
    expect(checkAction("pause", { status: "active", plan: strict, expiryDate: null, today })).toEqual({ ok: false, reason: "This plan can't be paused" });
  });

  it("blocks closing early unless the plan allows it or it has expired", () => {
    expect(checkAction("close", { status: "active", plan: strict, expiryDate: "2027-01-01", today }).ok).toBe(false);
    expect(checkAction("close", { status: "active", plan: strict, expiryDate: "2026-10-31", today }).ok).toBe(true);
  });

  it("renews only renewable plans with an end date", () => {
    expect(checkAction("renew", { status: "active", plan: flexible, expiryDate: "2027-01-01", today }).ok).toBe(true);
    expect(checkAction("renew", { status: "active", plan: flexible, expiryDate: null, today }).ok).toBe(false);
  });

  it("never changes a closed subscription", () => {
    expect(availableActions({ status: "closed", plan: flexible, expiryDate: null, today })).toEqual([]);
  });

  it("offers the right actions for an active flexible plan", () => {
    expect(availableActions({ status: "active", plan: flexible, expiryDate: "2027-01-01", today })).toEqual(["pause", "renew", "close"]);
  });
});
