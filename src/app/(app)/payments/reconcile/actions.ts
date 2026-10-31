"use server";
/**
 * Bank reconciliation actions.
 */
import { requireStaff } from "@/server/auth/access";
import { applyLines, ignoreLine, importStatement, sampleStatement } from "@/server/services/reconcile";
import { revalidatePath } from "next/cache";

function refresh() {
  for (const p of ["/payments", "/payments/reconcile", "/invoices", "/dashboard"]) revalidatePath(p);
}

export async function importStatementAction(fileName: string, text: string) {
  await requireStaff();
  return importStatement(fileName.slice(0, 120), text);
}

export async function importSampleAction() {
  await requireStaff();
  return importStatement("sample-statement.csv", await sampleStatement());
}

export async function applyLinesAction(importId: string, choices: { lineId: string; invoiceId?: string }[]) {
  await requireStaff();
  const result = await applyLines(importId, choices);
  refresh();
  return result;
}

export async function ignoreLineAction(lineId: string) {
  await requireStaff();
  await ignoreLine(lineId);
  refresh();
}
