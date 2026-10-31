/**
 * Bank reconciliation: import a statement, match lines to open invoices, apply payments.
 * Matching rules live in `lib/domain/matching` (pure, tested); this module stores and applies.
 */
import "server-only";
import { addDays, today } from "@/lib/dates";
import { AUTO_THRESHOLD, matchStatement, parseStatement } from "@/lib/domain/matching";
import { db } from "@/server/db";
import { bankImports, bankLines, customers, invoices } from "@/server/db/schema";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { recordPayment } from "./invoices";

async function openInvoices() {
  const rows = await db
    .select({ id: invoices.id, number: invoices.number, customerName: customers.name, total: invoices.total, amountPaid: invoices.amountPaid })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(and(eq(invoices.status, "confirmed"), gt(invoices.total, invoices.amountPaid)));
  return rows.map((r) => ({ id: r.id, number: r.number, customerName: r.customerName, balance: r.total - r.amountPaid }));
}

/** Parses and matches a statement, stores it, and returns the import id. */
export async function importStatement(fileName: string, text: string): Promise<{ importId: string } | { error: string }> {
  const parsed = parseStatement(text);
  if (parsed.error) return { error: parsed.error };
  if (parsed.lines.length === 0) return { error: "No incoming payments found in that file." };
  if (parsed.lines.length > 2000) return { error: "That statement is too long. Split it into files of up to 2,000 lines." };

  const matches = matchStatement(parsed.lines, await openInvoices());
  return db.transaction(async (tx) => {
    const [imp] = await tx.insert(bankImports).values({ fileName }).returning({ id: bankImports.id });
    await tx.insert(bankLines).values(
      matches.map((m) => ({
        importId: imp.id,
        txnDate: m.date,
        amount: m.amount,
        reference: m.reference,
        matchedInvoiceId: m.invoiceId,
        confidence: m.confidence.toFixed(3),
        status: m.invoiceId && m.confidence >= AUTO_THRESHOLD ? ("auto" as const) : ("review" as const),
      })),
    );
    return { importId: imp.id };
  });
}

/** Applies lines as payments (all auto matches, or specific lines with an optional chosen invoice). */
export async function applyLines(importId: string, choices: { lineId: string; invoiceId?: string }[]) {
  const lines = await db.select().from(bankLines).where(and(eq(bankLines.importId, importId), inArray(bankLines.id, choices.map((c) => c.lineId))));
  let applied = 0;
  const failures: string[] = [];
  const queue = lines.filter((l) => l.status !== "applied" && l.status !== "ignored");
  // A few at a time: each payment locks only its own invoice, so they don't block one another.
  const worker = async () => {
    for (let line = queue.shift(); line; line = queue.shift()) {
      const invoiceId = choices.find((c) => c.lineId === line.id)?.invoiceId ?? line.matchedInvoiceId;
      if (!invoiceId) continue;
      try {
        await recordPayment({ invoiceId, amount: line.amount, method: "bank", paidOn: line.txnDate, note: line.reference.slice(0, 200), source: "bank_match" });
        await db.update(bankLines).set({ status: "applied", matchedInvoiceId: invoiceId }).where(eq(bankLines.id, line.id));
        applied += 1;
      } catch (err) {
        failures.push(`${line.reference.slice(0, 40)}: ${err instanceof Error ? err.message : "failed"}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, queue.length) }, worker));
  return { applied, failures };
}

export async function ignoreLine(lineId: string) {
  await db.update(bankLines).set({ status: "ignored" }).where(eq(bankLines.id, lineId));
}

/** A demo statement built from real open invoices, with a realistic mix of easy and hard lines. */
export async function sampleStatement() {
  const open = (await openInvoices()).sort((a, b) => a.number.localeCompare(b.number)).slice(-60);
  const pick = (n: number, from: number) => open.slice(from, from + n);
  const date = (i: number) => addDays(today(), -(i % 5));
  const money = (paise: number) => (paise / 100).toFixed(2);
  const rows: string[][] = [];

  pick(12, 0).forEach((inv, i) => rows.push([date(i), `${["NEFT", "UPI", "IMPS", "RTGS"][i % 4]}/${inv.customerName.toUpperCase()}/${inv.number}`, money(inv.balance)]));
  pick(3, 12).forEach((inv, i) => rows.push([date(i), `NEFT CR ${inv.customerName.toUpperCase()} SUBSCRIPTION`, money(inv.balance)]));
  pick(2, 15).forEach((inv, i) => rows.push([date(i), `UPI/${inv.number}/PART PAYMENT`, money(Math.round(inv.balance / 2))]));
  pick(2, 17).forEach((inv, i) => rows.push([date(i), `CHQ DEP ${100200 + i}`, money(inv.balance)]));
  rows.push([today(), "CASH DEPOSIT BRANCH 0412", "15000.00"]);

  return ["Date,Description,Amount", ...rows.map((r) => r.map((f) => (f.includes(",") ? `"${f}"` : f)).join(","))].join("\n");
}

export async function getImport(importId: string) {
  const [imp] = await db.select().from(bankImports).where(eq(bankImports.id, importId));
  if (!imp) return null;
  const lines = await db
    .select({ line: bankLines, invoiceNumber: invoices.number, customerName: customers.name, total: invoices.total, amountPaid: invoices.amountPaid })
    .from(bankLines)
    .leftJoin(invoices, eq(invoices.id, bankLines.matchedInvoiceId))
    .leftJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(bankLines.importId, importId))
    .orderBy(desc(bankLines.confidence), bankLines.txnDate);
  return {
    ...imp,
    lines: lines.map(({ line, invoiceNumber, customerName, total, amountPaid }) => ({
      ...line,
      confidence: Number(line.confidence ?? 0),
      invoice: invoiceNumber ? { number: invoiceNumber, customerName: customerName!, balance: total! - amountPaid! } : null,
    })),
  };
}
