/**
 * The subscription lifecycle.
 *
 *   Draft → Quotation → Confirmed → Active → Closed
 *                                     ↕
 *                                   Paused
 *
 * Every status change goes through `checkAction`, on the server (enforcement) and in the UI
 * (which buttons to show), so the two can never disagree.
 */

export type SubscriptionStatus = "draft" | "quotation" | "confirmed" | "active" | "paused" | "closed";

export type SubscriptionAction = "send_quote" | "revise" | "confirm" | "activate" | "pause" | "resume" | "renew" | "close" | "discard";

export type PlanRules = { pausable: boolean; closable: boolean; renewable: boolean };

type Rule = {
  from: SubscriptionStatus[];
  /** Status after the action. Renew keeps the status and moves the expiry date instead. */
  to: SubscriptionStatus;
  label: string;
  /** Extra condition beyond the current status. Returns a reason when blocked. */
  guard?: (ctx: { plan: PlanRules; expiryDate: string | null; today: string }) => string | null;
};

export const ACTIONS: Record<SubscriptionAction, Rule> = {
  send_quote: { from: ["draft"], to: "quotation", label: "Send quotation" },
  revise: { from: ["quotation"], to: "draft", label: "Back to draft" },
  confirm: { from: ["quotation"], to: "confirmed", label: "Mark as accepted" },
  activate: { from: ["confirmed"], to: "active", label: "Activate" },
  pause: {
    from: ["active"],
    to: "paused",
    label: "Pause",
    guard: ({ plan }) => (plan.pausable ? null : "This plan can't be paused"),
  },
  resume: { from: ["paused"], to: "active", label: "Resume" },
  renew: {
    from: ["active"],
    to: "active",
    label: "Renew",
    guard: ({ plan, expiryDate }) => (!plan.renewable ? "This plan can't be renewed" : !expiryDate ? "It has no end date to extend" : null),
  },
  close: {
    from: ["active", "paused"],
    to: "closed",
    label: "Close",
    // Closing early needs a closable plan; once expired it can always be closed.
    guard: ({ plan, expiryDate, today }) => (plan.closable || (expiryDate !== null && expiryDate <= today) ? null : "This plan can't be closed early"),
  },
  discard: { from: ["draft", "quotation"], to: "closed", label: "Discard" },
};

/** The main path, used to draw the progress stepper. Paused is shown as a state of Active. */
export const STATUS_PATH: SubscriptionStatus[] = ["draft", "quotation", "confirmed", "active", "closed"];

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  draft: "Draft",
  quotation: "Quotation",
  confirmed: "Confirmed",
  active: "Active",
  paused: "Paused",
  closed: "Closed",
};

export function checkAction(
  action: SubscriptionAction,
  ctx: { status: SubscriptionStatus; plan: PlanRules; expiryDate: string | null; today: string },
): { ok: true; to: SubscriptionStatus } | { ok: false; reason: string } {
  const rule = ACTIONS[action];
  if (!rule.from.includes(ctx.status)) return { ok: false, reason: `Can't ${rule.label.toLowerCase()} a ${STATUS_LABEL[ctx.status].toLowerCase()} subscription` };
  const blocked = rule.guard?.(ctx);
  return blocked ? { ok: false, reason: blocked } : { ok: true, to: rule.to };
}

/** Actions available right now, in the order the UI should offer them (primary first). */
export function availableActions(ctx: { status: SubscriptionStatus; plan: PlanRules; expiryDate: string | null; today: string }) {
  return (Object.keys(ACTIONS) as SubscriptionAction[]).filter((a) => checkAction(a, ctx).ok);
}

/** Lines and terms can change until the customer accepts. */
export function isEditable(status: SubscriptionStatus) {
  return status === "draft" || status === "quotation";
}
